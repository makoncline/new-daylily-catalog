export class StorefrontNotFoundError extends Error {
  constructor() {
    super("Storefront not found.");
    this.name = "StorefrontNotFoundError";
  }
}

export class StorefrontUnavailableError extends Error {
  constructor(message = "Storefront data is unavailable.") {
    super(message);
    this.name = "StorefrontUnavailableError";
  }
}

export class StorefrontContractError extends Error {
  constructor(message = "The storefront response did not match version 1.") {
    super(message);
    this.name = "StorefrontContractError";
  }
}
