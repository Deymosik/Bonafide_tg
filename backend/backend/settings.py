# backend/backend/settings.py
from pathlib import Path
import dj_database_url
from dotenv import load_dotenv
import os


load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# Эта часть идеальна, ничего не меняем
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'default-insecure-key')
DEBUG = os.environ.get('DJANGO_DEBUG', '') != 'False'

# --- 1. КЛЮЧЕВОЕ ИЗМЕНЕНИЕ ДЛЯ ALLOWED_HOSTS ---
# Теперь хосты читаются из переменной окружения.
# На сервере вы укажете: ALLOWED_HOSTS_STR="bonafide55.ru,www.bonafide55.ru"
allowed_hosts_str = os.environ.get('ALLOWED_HOSTS_STR', '127.0.0.1,localhost')
ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_str.split(',')]

if not DEBUG:
    # Говорим Django, что он находится за прокси, и доверять заголовку X-Forwarded-Proto,
    # который Nginx отправляет, чтобы указать, что исходное соединение было по HTTPS.
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

    # Говорим Django использовать заголовок X-Forwarded-Host
    USE_X_FORWARDED_HOST = True

    # Требуем, чтобы все сессионные cookie отправлялись с флагом 'Secure'
    # (только по HTTPS).
    SESSION_COOKIE_SECURE = True

    # Требуем, чтобы все CSRF cookie отправлялись с флагом 'Secure'.
    CSRF_COOKIE_SECURE = True

    # Указываем Django, какие HTTPS-источники (origins) являются доверенными
    # для "небезопасных" запросов (POST, PUT, DELETE).
    # Это главная настройка, которая исправляет ошибку CSRF.
    CSRF_TRUSTED_ORIGINS = ['https://bf55.ru', 'https://www.bf55.ru']

# INSTALLED_APPS и MIDDLEWARE остаются без изменений
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_ckeditor_5',
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
    'DEFAULT_AUTHENTICATION_CLASSES': [],
}

# --- 2. КЛЮЧЕВОЕ ИЗМЕНЕНИЕ ДЛЯ CORS ---
# Логика аналогична ALLOWED_HOSTS. По умолчанию - локальная разработка.
# На сервере вы укажете: CORS_ALLOWED_ORIGINS_STR="https://bonafide55.ru,https://www.bonafide55.ru"
cors_origins_str = os.environ.get('CORS_ALLOWED_ORIGINS_STR', 'http://localhost:3000,http://127.0.0.1:3000')
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_origins_str.split(',')]

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
        'default': dj_database_url.config(conn_max_age=600, ssl_require=False)
    }
elif all(key in os.environ for key in ['SQL_DATABASE', 'SQL_USER', 'SQL_PASSWORD', 'SQL_HOST', 'SQL_PORT']):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('SQL_DATABASE'),
            'USER': os.environ.get('SQL_USER'),
            'PASSWORD': os.environ.get('SQL_PASSWORD'),
            'HOST': os.environ.get('SQL_HOST'),
            'PORT': os.environ.get('SQL_PORT'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


# --- КОНФИГУРАЦИЯ ДЛЯ DJANGO-CKEDITOR-5 ---
CKEDITOR_5_UPLOAD_PATH = "uploads/"
# Настройки для разных видов редакторов. Мы создадим одну конфигурацию 'default'.
CKEDITOR_5_CONFIGS = {
    'default': {
        # Язык интерфейса редактора
        'language': 'ru',
        # Конфигурация панели инструментов
        'toolbar': ['heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote', '|', 'undo', 'redo'],
    },
    'extends': {
        'blockToolbar': [
            'paragraph', 'heading1', 'heading2', 'heading3',
            '|',
            'bulletedList', 'numberedList',
            '|',
            'blockQuote',
        ],
        'toolbar': ['heading', '|', 'outdent', 'indent', '|', 'bold', 'italic', 'link', 'underline', 'strikethrough',
        'code','subscript', 'superscript', 'highlight', '|', 'codeBlock', 'sourceEditing', 'insertImage',
                    'bulletedList', 'numberedList', 'todoList', '|',  'blockQuote', 'imageUpload', '|',
                    'fontSize', 'fontFamily', 'fontColor', 'fontBackgroundColor', 'mediaEmbed', 'removeFormat',
                    'insertTable',],
        'table': {
            'contentToolbar': [ 'tableColumn', 'tableRow', 'mergeTableCells',
            'tableProperties', 'tableCellProperties' ],
            'tableProperties': {
                'borderColors': 'custom',
                'backgroundColors': 'custom'
            },
            'tableCellProperties': {
                'borderColors': 'custom',
                'backgroundColors': 'custom'
            }
        },
        'heading' : {
            'options': [
                { 'model': 'paragraph', 'title': 'Paragraph', 'class': 'ck-heading_paragraph' },
                { 'model': 'heading1', 'view': 'h1', 'title': 'Heading 1', 'class': 'ck-heading_heading1' },
                { 'model': 'heading2', 'view': 'h2', 'title': 'Heading 2', 'class': 'ck-heading_heading2' },
                { 'model': 'heading3', 'view': 'h3', 'title': 'Heading 3', 'class': 'ck-heading_heading3' }
            ]
        }
    },
    'list': {
        'properties': {
            'styles': 'true',
            'startIndex': 'true',
            'reversed': 'true',
        }
    }
}

# Остальная часть файла идеальна, ничего не меняем
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'ru-ru'
TIME_ZONE = 'Europe/Moscow'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/django-static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

