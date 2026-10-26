import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-semibold">Страница не найдена</h1>
      <p className="mt-2 text-silver-2">Возможно, ссылка устарела.</p>
      <Link href="/" className="btn-primary mt-6">
        На главную
      </Link>
    </div>
  );
}
