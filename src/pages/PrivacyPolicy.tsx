import LegalDocPage from "@/components/legal/LegalDocPage";
import content from "../../docs/legal/Privacy-Policy.md?raw";

export default function PrivacyPolicy() {
  return <LegalDocPage title="Privacy Policy" content={content} />;
}
