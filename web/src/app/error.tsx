"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-semibold">Что-то пошло не так</h1>
      <p className="mt-2 text-silver-2">Попробуйте ещё раз через минуту.</p>
      <button onClick={reset} className="btn-primary mt-6">
        Повторить
      </button>
    </div>
  );
}
