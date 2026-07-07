import LegalDocPage from "@/components/legal/LegalDocPage";
import content from "../../docs/legal/Delete-Account.md?raw";

export default function DeleteAccountPolicy() {
  return <LegalDocPage title="Delete Account" content={content} />;
}
