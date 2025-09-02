#!/bin/sh

# Этот скрипт выполняется от имени root по умолчанию

# 1. Устанавливаем правильного владельца для папок, куда монтируются тома.
chown -R appuser:appuser /app/staticfiles
chown -R appuser:appuser /app/media

# 2. Передаем управление основной команде, запуская ее от имени 'appuser' с помощью gosu
exec gosu appuser "$@"