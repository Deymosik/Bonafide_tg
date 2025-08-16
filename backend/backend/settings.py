# backend/backend/settings.py

from pathlib import Path
import dj_database_url
from dotenv import load_dotenv
import os
from datetime import timedelta
# ИЗМЕНЕНИЕ 1: Мы будем использовать стандартную библиотеку os для переменных,
# поэтому убираем импорты dj_database_url и decouple.
# from decouple import config - УДАЛИТЬ
# import dj_database_url - УДАЛИТЬ
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# Эта часть идеальна, ничего не меняем
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'default-insecure-key')
DEBUG = os.environ.get('DJANGO_DEBUG', '') != 'False'

# Эта часть идеальна, ничего не меняем
ALLOWED_HOSTS = [
    'bonafide55.ru',
    'www.bonafide55.ru',
    '127.0.0.1',
    # Сюда нужно будет добавить IP-адрес вашего сервера после его создания
]

# INSTALLED_APPS и MIDDLEWARE остаются без изменений
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'ckeditor',
    'shop',
    'rest_framework',
    'corsheaders',
    'imagekit',
    'django_cleanup.apps.CleanupConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# backend/backend/settings.py
REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
}

# Эта часть идеальна, ничего не меняем
#CORS_ALLOWED_ORIGINS = [
 #   "https://bonafide55.ru",
  #  "https://www.bonafide55.ru",
#]
# Настройки для CORS
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000", # Адрес нашего будущего React-приложения
    "http://127.0.0.1:3000",
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

# ИЗМЕНЕНИЕ 2: Заменяем блок DATABASES на этот
# Этот код будет работать как локально с sqlite (если переменных нет),
# так и на сервере с PostgreSQL (когда переменные будут в .env файле)
if 'DATABASE_URL' in os.environ:
    DATABASES = {
        'default': dj_database_url.config(conn_max_age=600, ssl_require=False) # Убедитесь, что ssl_require=False
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


# Остальная часть файла идеальна, ничего не меняем
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

