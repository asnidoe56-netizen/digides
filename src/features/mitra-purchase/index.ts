export {
  CategoryPurchaseFlow,
  type CategoryPurchaseFlowProps,
  type CustomerIdFieldConfig,
} from "./components/category-purchase-flow";
export { NUMERIC_ID_FIELD } from "./customer-id-presets";
// Reused as-is by Menu Transfer — a PIN gate with no category-specific
// text baked in, so any other money-moving flow can share it too.
export { PurchasePinScreen } from "./components/purchase-pin-screen";
