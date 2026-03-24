'use client';

import { PageContainer, PageContent, PageHeader } from '@/components/common';

import { ServiceForm } from '../components/service-form';

export default function NewServicePage() {
  return (
    <PageContainer>
      <PageHeader
        title="Create Service"
        description="Add a new service to your catalog"
        backHref="/services"
      />
      <PageContent>
        <ServiceForm />
      </PageContent>
    </PageContainer>
  );
}
