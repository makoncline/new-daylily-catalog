import { z } from "zod";

import {
  cartInquirySchema,
  contactInquirySchema,
  editorOutputDataSchema,
  inquiryCartLineSchema,
  inquiryReceiptSchema,
  inquirySchema,
  storefrontCultivarDetailsSchema,
  storefrontCultivarSchema,
  storefrontImageSchema,
  storefrontListingSchema,
  storefrontListSchema,
  storefrontSellerProfileSchema,
  storefrontSellerSchema,
  storefrontSiteIdentities,
  storefrontSnapshotSchema,
} from "./runtime.js";

export * from "./runtime.js";

export type EditorOutputData = z.infer<typeof editorOutputDataSchema>;
export type StorefrontImage = z.infer<typeof storefrontImageSchema>;
export type StorefrontCultivarDetails = z.infer<
  typeof storefrontCultivarDetailsSchema
>;
export type StorefrontCultivar = z.infer<typeof storefrontCultivarSchema>;
export type StorefrontListing = z.infer<typeof storefrontListingSchema>;
export type StorefrontList = z.infer<typeof storefrontListSchema>;
export type StorefrontSellerProfile = z.infer<
  typeof storefrontSellerProfileSchema
>;
export type StorefrontSeller = z.infer<typeof storefrontSellerSchema>;
export type StorefrontSnapshot = z.infer<typeof storefrontSnapshotSchema>;
export type StorefrontSiteIdentity = (typeof storefrontSiteIdentities)[number];
export type InquiryCartLine = z.infer<typeof inquiryCartLineSchema>;
export type ContactInquiry = z.infer<typeof contactInquirySchema>;
export type CartInquiry = z.infer<typeof cartInquirySchema>;
export type Inquiry = z.infer<typeof inquirySchema>;
export type InquiryReceipt = z.infer<typeof inquiryReceiptSchema>;
