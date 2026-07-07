import LegalDocPage from "@/components/legal/LegalDocPage";
import content from "../../docs/legal/Partner-Terms.md?raw";

export default function PartnerTerms() {
  return <LegalDocPage title="Partner Terms & Conditions" content={content} />;
}
