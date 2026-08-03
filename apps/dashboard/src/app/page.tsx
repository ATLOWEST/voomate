import { redirect } from 'next/navigation';

export default function IndexPage() {
  // Agents are the object merchants actually came here for. There is no separate "home"
  // dashboard until there is enough usage data to make one worth looking at.
  redirect('/agents');
}
