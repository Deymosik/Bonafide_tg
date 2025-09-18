# проект/backend/shop/utils.py

import hmac
import hashlib
import json
from urllib.parse import parse_qsl

def validate_init_data(init_data_str: str, bot_token: str):
    """
    Проверяет и парсит строку initData из Telegram Web App.

    :param init_data_str: Полная строка initData из window.Telegram.WebApp.initData
    :param bot_token: Секретный токен вашего бота.
    :return: Словарь с данными пользователя, если валидация прошла успешно, иначе None.
    """
    try:
        # Разбираем строку на параметры
        parsed_data = dict(parse_qsl(init_data_str))
        hash_from_telegram = parsed_data.pop("hash", None)

        if not hash_from_telegram:
            return None

        # Формируем строку для проверки хеша в алфавитном порядке
        data_check_string = "\n".join(
            f"{key}={value}" for key, value in sorted(parsed_data.items())
        )

        # Генерируем секретный ключ из токена бота
        secret_key = hmac.new(
            key=b"WebAppData", msg=bot_token.encode(), digestmod=hashlib.sha256
        ).digest()

        # Генерируем наш хеш
        calculated_hash = hmac.new(
            key=secret_key, msg=data_check_string.encode(), digestmod=hashlib.sha256
        ).hexdigest()

        # Сравниваем хеши
        if calculated_hash == hash_from_telegram:
            # Данные валидны, возвращаем информацию о пользователе
            user_data = json.loads(parsed_data.get("user", "{}"))
            return user_data
    except Exception:
        # В случае любой ошибки (например, битый JSON) считаем данные невалидными
        return None

    return None