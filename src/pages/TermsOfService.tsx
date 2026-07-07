import LegalDocPage from "@/components/legal/LegalDocPage";
import content from "../../docs/legal/Terms-of-Service.md?raw";

export default function TermsOfService() {
  return <LegalDocPage title="Terms of Service" content={content} />;
}
