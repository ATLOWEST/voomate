import { redirect } from 'next/navigation';

export default function SuperAdminIndexPage() {
  redirect('/admin/merchants');
}
