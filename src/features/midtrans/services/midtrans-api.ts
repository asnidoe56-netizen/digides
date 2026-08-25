import { apiFetch } from "@/lib/api/client";
import type { MidtransSettingsFormValues } from "../schemas/midtrans-settings.schema";
import type { MidtransConnectionTestResult, MidtransSettingsView } from "@/services/midtrans.service";

export function saveMidtransSettings(input: MidtransSettingsFormValues) {
  return apiFetch<MidtransSettingsView>("/api/midtrans/settings", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function testMidtransConnection() {
  return apiFetch<MidtransConnectionTestResult>("/api/midtrans/test-connection", { method: "POST" });
}
