#!/usr/bin/env node
import ApkReader from "adbkit-apkreader";
import * as yauzl from "yauzl";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

interface UsesFeature {
  name: string;
  required: boolean;
}

interface ApkInfo {
  filePath: string;
  packageName: string | null;
  permissions: string[];
  usesFeatures: UsesFeature[];
  hardwareApis: string[];
  queriedPackages: string[];
  queriedIntents: string[];
  queriedProviders: string[];
}

interface XmlNode {
  nodeName: string;
  attributes: Array<{
    name: string;
    typedValue: { value: unknown };
  }>;
  childNodes: XmlNode[];
}

function extractQueriesFromXml(document: XmlNode): {
  packages: string[];
  intents: string[];
  providers: string[];
} {
  const packages: string[] = [];
  const intents: string[] = [];
  const providers: string[] = [];

  function findQueriesElement(node: XmlNode): XmlNode | null {
    if (node.nodeName === "queries") {
      return node;
    }
    for (const child of node.childNodes || []) {
      const found = findQueriesElement(child);
      if (found) return found;
    }
    return null;
  }

  const queriesNode = findQueriesElement(document);
  if (!queriesNode) {
    return { packages, intents, providers };
  }

  for (const child of queriesNode.childNodes || []) {
    if (child.nodeName === "package") {
      const nameAttr = child.attributes.find((a) => a.name === "name");
      if (nameAttr?.typedValue?.value) {
        packages.push(String(nameAttr.typedValue.value));
      }
    } else if (child.nodeName === "intent") {
      for (const intentChild of child.childNodes || []) {
        if (intentChild.nodeName === "action") {
          const nameAttr = intentChild.attributes.find((a) => a.name === "name");
          if (nameAttr?.typedValue?.value) {
            intents.push(String(nameAttr.typedValue.value));
          }
        }
      }
    } else if (child.nodeName === "provider") {
      const authAttr = child.attributes.find((a) => a.name === "authorities");
      if (authAttr?.typedValue?.value) {
        providers.push(String(authAttr.typedValue.value));
      }
    }
  }

  return { packages, intents, providers };
}

const HARDWARE_API_PATTERNS = [
  { pattern: "Landroid/hardware/Sensor;", label: "android.hardware.Sensor" },
  { pattern: "Landroid/hardware/SensorManager;", label: "android.hardware.SensorManager" },
  { pattern: "Landroid/hardware/SensorEvent;", label: "android.hardware.SensorEvent" },
  { pattern: "Landroid/hardware/SensorEventListener;", label: "android.hardware.SensorEventListener" },
  { pattern: "Landroid/hardware/camera2/", label: "android.hardware.camera2" },
  { pattern: "Landroid/hardware/Camera;", label: "android.hardware.Camera" },
  { pattern: "Landroid/location/LocationManager;", label: "android.location.LocationManager" },
  { pattern: "Landroid/media/AudioRecord;", label: "android.media.AudioRecord" },
  { pattern: "Landroid/bluetooth/", label: "android.bluetooth" },
  { pattern: "Landroid/nfc/", label: "android.nfc" },
  { pattern: "Landroid/hardware/fingerprint/", label: "android.hardware.fingerprint" },
  { pattern: "Landroid/hardware/biometrics/", label: "android.hardware.biometrics" },
];

async function scanDexForHardwareApis(apkPath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const foundApis = new Set<string>();

    yauzl.open(apkPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        reject(err || new Error("Failed to open APK file"));
        return;
      }

      const dexBuffers: Buffer[] = [];
      let pendingReads = 0;

      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        if (entry.fileName.match(/^classes\d*\.dex$/)) {
          pendingReads++;
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err || !readStream) {
              pendingReads--;
              zipfile.readEntry();
              return;
            }
            const chunks: Buffer[] = [];
            readStream.on("data", (chunk) => chunks.push(chunk));
            readStream.on("end", () => {
              dexBuffers.push(Buffer.concat(chunks));
              pendingReads--;
              zipfile.readEntry();
            });
          });
        } else {
          zipfile.readEntry();
        }
      });

      zipfile.on("end", () => {
        const checkComplete = () => {
          if (pendingReads > 0) {
            setTimeout(checkComplete, 10);
            return;
          }

          for (const buffer of dexBuffers) {
            const content = buffer.toString("latin1");
            for (const { pattern, label } of HARDWARE_API_PATTERNS) {
              if (content.includes(pattern)) {
                foundApis.add(label);
              }
            }
          }
          resolve(Array.from(foundApis).sort());
        };
        checkComplete();
      });

      zipfile.on("error", reject);
    });
  });
}

async function extractApkFromApkm(apkmPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "apkm-"));

    yauzl.open(apkmPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        reject(err || new Error("Failed to open APKM file"));
        return;
      }

      let baseApkPath: string | null = null;

      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        const fileName = entry.fileName.toLowerCase();
        if (fileName === "base.apk" || fileName.endsWith("/base.apk")) {
          const outputPath = path.join(tempDir, "base.apk");
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err || !readStream) {
              reject(err || new Error("Failed to read base.apk"));
              return;
            }
            const writeStream = fs.createWriteStream(outputPath);
            readStream.pipe(writeStream);
            writeStream.on("close", () => {
              baseApkPath = outputPath;
              zipfile.readEntry();
            });
          });
        } else {
          zipfile.readEntry();
        }
      });

      zipfile.on("end", () => {
        if (baseApkPath) {
          resolve(baseApkPath);
        } else {
          reject(new Error("No base.apk found in APKM file"));
        }
      });

      zipfile.on("error", reject);
    });
  });
}

async function inspectApk(apkPath: string): Promise<ApkInfo> {
  const reader = await ApkReader.open(apkPath);
  const manifest = await reader.readManifest();
  const rawXml = await reader.readXml("AndroidManifest.xml") as XmlNode;

  const permissions: string[] = [];
  const usesFeatures: UsesFeature[] = [];

  if (manifest.usesPermissions) {
    for (const perm of manifest.usesPermissions) {
      if (perm.name) {
        permissions.push(perm.name);
      }
    }
  }

  if (manifest.usesFeatures) {
    for (const feature of manifest.usesFeatures) {
      if (feature.name) {
        usesFeatures.push({
          name: feature.name,
          required: feature.required !== false,
        });
      }
    }
  }

  const queries = extractQueriesFromXml(rawXml);
  const hardwareApis = await scanDexForHardwareApis(apkPath);

  return {
    filePath: apkPath,
    packageName: manifest.package || null,
    permissions: permissions.sort(),
    usesFeatures: usesFeatures.sort((a, b) => a.name.localeCompare(b.name)),
    hardwareApis,
    queriedPackages: queries.packages.sort(),
    queriedIntents: queries.intents.sort(),
    queriedProviders: queries.providers.sort(),
  };
}

async function inspectFile(filePath: string): Promise<ApkInfo> {
  const ext = path.extname(filePath).toLowerCase();
  let apkPath = filePath;
  let tempApkPath: string | null = null;

  if (ext === ".apkm") {
    console.log(`Extracting base.apk from APKM bundle...`);
    tempApkPath = await extractApkFromApkm(filePath);
    apkPath = tempApkPath;
  }

  try {
    const info = await inspectApk(apkPath);
    info.filePath = filePath;
    return info;
  } finally {
    if (tempApkPath) {
      fs.rmSync(path.dirname(tempApkPath), { recursive: true, force: true });
    }
  }
}

function printInfo(info: ApkInfo): void {
  console.log("\n" + "=".repeat(60));
  console.log(`File: ${info.filePath}`);
  if (info.packageName) {
    console.log(`Package: ${info.packageName}`);
  }
  console.log("=".repeat(60));

  console.log("\n📋 PERMISSIONS:");
  if (info.permissions.length === 0) {
    console.log("  (none)");
  } else {
    for (const perm of info.permissions) {
      console.log(`  • ${perm}`);
    }
  }

  console.log("\n🔧 USES FEATURES:");
  if (info.usesFeatures.length === 0) {
    console.log("  (none)");
  } else {
    for (const feature of info.usesFeatures) {
      const requiredStr = feature.required ? "required" : "optional";
      console.log(`  • ${feature.name} (${requiredStr})`);
    }
  }

  console.log("\n📡 HARDWARE APIS (detected in code):");
  if (info.hardwareApis.length === 0) {
    console.log("  (none)");
  } else {
    for (const api of info.hardwareApis) {
      console.log(`  • ${api}`);
    }
  }

  console.log("\n📦 QUERIED PACKAGES:");
  if (info.queriedPackages.length === 0) {
    console.log("  (none)");
  } else {
    for (const pkg of info.queriedPackages) {
      console.log(`  • ${pkg}`);
    }
  }

  console.log("\n🎯 QUERIED INTENTS:");
  if (info.queriedIntents.length === 0) {
    console.log("  (none)");
  } else {
    for (const intent of info.queriedIntents) {
      console.log(`  • ${intent}`);
    }
  }

  console.log("\n🔌 QUERIED PROVIDERS:");
  if (info.queriedProviders.length === 0) {
    console.log("  (none)");
  } else {
    for (const provider of info.queriedProviders) {
      console.log(`  • ${provider}`);
    }
  }

  console.log();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: apk-inspector <file.apk|file.apkm> [...]");
    console.log("\nInspects APK and APKM files for permissions and package queries.");
    process.exit(1);
  }

  for (const filePath of args) {
    const resolvedPath = path.resolve(filePath);

    if (!fs.existsSync(resolvedPath)) {
      console.error(`Error: File not found: ${resolvedPath}`);
      continue;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    if (ext !== ".apk" && ext !== ".apkm") {
      console.error(`Error: Unsupported file type: ${ext}`);
      continue;
    }

    try {
      const info = await inspectFile(resolvedPath);
      printInfo(info);
    } catch (error) {
      console.error(`Error inspecting ${filePath}:`, error);
    }
  }
}

main();
