import { useState } from 'react';
import { z } from 'zod';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';

interface ContactFormProps {
  variant?: 'full' | 'compact';
  className?: string;
}

export const ContactForm = ({ variant = 'full', className = '' }: ContactFormProps) => {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    message: '',
  });

  const contactSchema = z.object({
    name: z.string().trim().min(2, t.contact.errors.nameMin).max(100),
    email: z.string().trim().email(t.contact.errors.emailInvalid).max(255),
    organization: z.string().optional(),
    message: z.string().trim().min(10, t.contact.errors.messageMin).max(1000),
  });

  const compactSchema = z.object({
    email: z.string().trim().email(t.contact.errors.emailInvalid).max(255),
    message: z.string().trim().min(10, t.contact.errors.messageMin).max(1000),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const schema = variant === 'compact' ? compactSchema : contactSchema;
    const dataToValidate = variant === 'compact' 
      ? { email: formData.email, message: formData.message }
      : formData;

    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((error) => {
        if (error.path[0]) {
          fieldErrors[error.path[0] as string] = error.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast({
      title: '✓',
      description: t.contact.success,
    });

    setFormData({ name: '', email: '', organization: '', message: '' });
    setIsSubmitting(false);
  };

  if (variant === 'compact') {
    return (
      <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
        <div>
          <Input
            type="email"
            name="email"
            placeholder={t.contact.emailPlaceholder}
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? 'border-destructive' : ''}
          />
          {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
        </div>
        <div>
          <Textarea
            name="message"
            placeholder={t.contact.messagePlaceholder}
            value={formData.message}
            onChange={handleChange}
            rows={3}
            className={errors.message ? 'border-destructive' : ''}
          />
          {errors.message && <p className="text-destructive text-xs mt-1">{errors.message}</p>}
        </div>
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            t.contact.sending
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              {t.contact.submit}
            </>
          )}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t.contact.name}</Label>
          <Input
            id="name"
            name="name"
            placeholder={t.contact.namePlaceholder}
            value={formData.name}
            onChange={handleChange}
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t.contact.email}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder={t.contact.emailPlaceholder}
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? 'border-destructive' : ''}
          />
          {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="organization">{t.contact.organization}</Label>
        <Input
          id="organization"
          name="organization"
          placeholder={t.contact.organizationPlaceholder}
          value={formData.organization}
          onChange={handleChange}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">{t.contact.message}</Label>
        <Textarea
          id="message"
          name="message"
          placeholder={t.contact.messagePlaceholder}
          value={formData.message}
          onChange={handleChange}
          rows={5}
          className={errors.message ? 'border-destructive' : ''}
        />
        {errors.message && <p className="text-destructive text-xs">{errors.message}</p>}
      </div>
      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? (
          t.contact.sending
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            {t.contact.submit}
          </>
        )}
      </Button>
    </form>
  );
};

export default ContactForm;
