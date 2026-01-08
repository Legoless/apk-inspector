declare module "adbkit-apkreader" {
  interface Manifest {
    package?: string;
    usesPermissions?: Array<{ name?: string }>;
    usesFeatures?: Array<{ name?: string; required?: boolean }>;
  }

  class ApkReader {
    static open(path: string): Promise<ApkReader>;
    readManifest(): Promise<Manifest>;
    readXml(name: string): Promise<unknown>;
  }

  export default ApkReader;
}
