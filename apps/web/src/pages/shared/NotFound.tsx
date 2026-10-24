import { ButtonLink } from '../../components/ui';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl">🧭</p>
      <h1 className="text-2xl font-bold">We couldn’t find that page</h1>
      <p className="text-muted">The link might be old, or the page has moved.</p>
      <ButtonLink to="/">Go home</ButtonLink>
    </div>
  );
}
