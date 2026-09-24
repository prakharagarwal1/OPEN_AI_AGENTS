declare module "compression" {
  import { RequestHandler } from "express";
  const compression: (options?: unknown) => RequestHandler;
  export default compression;
}