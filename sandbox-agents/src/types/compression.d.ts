declare module "compression" {
  import { RequestHandler } from "express";
  const compression: (options?: any) => RequestHandler;
  export default compression;
}