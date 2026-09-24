declare module "rate-limiter-flexible" {
  export class RateLimiterRedis {
    constructor(options: any);
    consume(key: string): Promise<any>;
  }
}