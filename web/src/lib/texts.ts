// Russian fallback text for action errors (Server Actions return { error, code }).
// The UI translates by `code` through the "Errors" messages namespace; this table only guarantees a readable message
// when a code has no translation. All other site wording lives in messages/ru.json and messages/en.json.
export const ERROR_TEXT: Record<string, string> = {
  INVALID_ADDRESS: "Это не похоже на адрес. Нужен адрес вида 0x… (Ethereum, BNB и др.), T… (Tron) или ENS-имя вида name.eth.",
  INVALID_NETWORK: "Эта сеть не поддерживается.",
  INVALID_CATEGORY: "Выберите, что случилось.",
  DESCRIPTION_SHORT: "Опишите ситуацию хотя бы парой предложений.",
  DESCRIPTION_LONG: "Описание слишком длинное (до 2000 символов).",
  INVALID_LINK: "Ссылка должна начинаться с https://",
  NOT_A_CONTRACT: "По этому адресу нет контракта в выбранной сети. Проверьте сеть или вставьте адрес токена.",
  UNSUPPORTED: "Этот контракт не похож на токен — для него такой анализ недоступен.",
  RATE_LIMITED: "Слишком много запросов. Подождите минуту.",
  CONFIG_MISSING: "Эта сеть пока не подключена.",
  UNAVAILABLE: "Сервис данных временно недоступен. Попробуйте позже.",
  UPSTREAM: "Сервис данных временно недоступен. Попробуйте позже.",
};
