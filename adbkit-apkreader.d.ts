declare module "adbkit-apkreader" {
  interface Manifest {
    package?: string;
    usesPermissions?: Array<{ name?: string }>;
  }

  class ApkReader {
    static open(path: string): Promise<ApkReader>;
    readManifest(): Promise<Manifest>;
    readXml(name: string): Promise<unknown>;
  }

  export default ApkReader;
}
