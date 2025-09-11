// проект/frontend/src/pages/CheckoutForm.js

import React, { useEffect } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { IMaskInput } from 'react-imask';
import { useCart } from '../context/CartContext';
import { useTelegram } from '../utils/telegram';
import { useSettings } from '../context/SettingsContext';
import apiClient from '../api';
import './CartPage.css';

const CheckoutForm = ({ onBack }) => {
    const tg = useTelegram();
    const settings = useSettings();
    const { cartItems, selectedItems, selectionInfo, deleteSelectedItems } = useCart();

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isValid }
    } = useForm({
        mode: 'onChange',
        defaultValues: {
            firstName: tg.initDataUnsafe?.user?.first_name ?? '',
            lastName: tg.initDataUnsafe?.user?.last_name ?? '',
            delivery_method: 'Почта России'
        }
    });

    const deliveryMethod = useWatch({ control, name: 'delivery_method' });

    useEffect(() => {
        tg.BackButton.show();
        tg.BackButton.onClick(onBack);
        return () => { tg.BackButton.offClick(onBack); };
    }, [onBack, tg]);

    const onSubmit = async (formData) => {
        const itemsToOrder = cartItems
            .filter(item => selectedItems.has(item.product.id))
            .map(item => ({ product_id: item.product.id, quantity: item.quantity }));

        const orderDataForBackend = {
            first_name: formData.firstName,
            last_name: formData.lastName,
            patronymic: formData.patronymic,
            phone: formData.phone,
            delivery_method: formData.delivery_method,
            ...getAddressData(formData)
        };

        orderDataForBackend.items = itemsToOrder;

        try {
            await apiClient.post('/orders/create/', orderDataForBackend);
            sendTelegramMessage(formData);
            deleteSelectedItems();
            tg.close();

        } catch (error) {
            const errorText = error.response?.data ? JSON.stringify(error.response.data) : 'Произошла ошибка при сохранении заказа';
            tg.showAlert(errorText);
        }
    };

    const getAddressData = (data) => {
        if (data.delivery_method === 'Почта России') {
            return {
                city: data.post_city,
                region: data.post_region,
                district: data.post_district,
                street: data.post_street,
                house: data.post_house,
                apartment: data.post_apartment,
                postcode: data.post_postcode
            };
        }
        if (data.delivery_method === 'СДЭК') {
            return {
                city: data.cdek_city,
                cdek_office_address: data.cdek_office_address
            };
        }
        return {};
    };

    const sendTelegramMessage = (formData) => {
        const itemsToOrder = cartItems.filter(item => selectedItems.has(item.product.id));
        const orderDetails = itemsToOrder.map(item =>
            `${item.product.name} (x${item.quantity})`
        ).join('\n');

        const summary = `
-----------------
Сумма: ${selectionInfo.subtotal} ₽
Скидка (${selectionInfo.applied_rule || 'нет'}): ${selectionInfo.discount_amount} ₽
**Итого к оплате: ${selectionInfo.final_total} ₽**
        `.trim().replace(/^ +/gm, '');

        let addressBlock = '';
        if (formData.delivery_method === 'Почта России') {
            addressBlock = `
**Доставка:** Почта России
**Куда:** ${formData.post_region}, ${formData.post_district || 'N/A'}, г. ${formData.post_city}, ул. ${formData.post_street}, д. ${formData.post_house}, кв. ${formData.post_apartment}
**Индекс:** ${formData.post_postcode}
            `.trim().replace(/^ +/gm, '');
        } else { // СДЭК
            addressBlock = `
**Доставка:** СДЭК (Пункт выдачи)
**Город:** ${formData.cdek_city}
**Адрес ПВЗ:** ${formData.cdek_office_address}
            `.trim().replace(/^ +/gm, '');
        }

        const fullMessage = `
Новый заказ!

**Клиент:** ${formData.lastName} ${formData.firstName} ${formData.patronymic || ''}
**Телефон:** ${formData.phone}

${addressBlock}

**Состав заказа:**
${orderDetails}

${summary}
        `.trim().replace(/^ +/gm, '');

        const managerUsername = settings.manager_username || 'username';
        const encodedText = encodeURIComponent(fullMessage);
        const telegramLink = `https://t.me/${managerUsername}?text=${encodedText}`;

        tg.openTelegramLink(telegramLink);
    };

    return (
        <div className="cart-page">
            <h1 className="form-title">Оформление</h1>
            <form className="checkout-form" onSubmit={handleSubmit(onSubmit)}>
                {/* --- БЛОК КОНТАКТНЫХ ДАННЫХ --- */}
                <div className="form-grid">
                    <div className="form-field grid-full-width">
                        <input type="text" placeholder="Фамилия" {...register('lastName', { required: 'Фамилия обязательна' })} className={`form-input ${errors.lastName ? 'invalid' : ''}`} maxLength={50} />
                        {errors.lastName && <p className="error-message">{errors.lastName.message}</p>}
                    </div>
                    <div className="form-field">
                        <input type="text" placeholder="Имя" {...register('firstName', { required: 'Имя обязательно' })} className={`form-input ${errors.firstName ? 'invalid' : ''}`} maxLength={50} />
                        {errors.firstName && <p className="error-message">{errors.firstName.message}</p>}
                    </div>
                    <div className="form-field">
                        <input type="text" placeholder="Отчество (если есть)" {...register('patronymic')} className="form-input" maxLength={50} />
                    </div>
                    <div className="form-field grid-full-width">
                        <Controller name="phone" control={control} rules={{ required: 'Номер телефона обязателен', minLength: { value: 18, message: 'Введите номер полностью' }}}
                                    render={({ field }) => <IMaskInput {...field} mask="+{7} (000) 000-00-00" placeholder="Номер телефона" className={`form-input ${errors.phone ? 'invalid' : ''}`} onAccept={(value) => field.onChange(value)} />}
                        />
                        {errors.phone && <p className="error-message">{errors.phone.message}</p>}
                    </div>
                </div>

                {/* --- БЛОК ВЫБОРА ДОСТАВКИ --- */}
                <h2 className="form-section-title">Какую службу вы выберете для доставки?</h2>
                <div className="shipping-options">
                    <label className={deliveryMethod === 'Почта России' ? 'active' : ''}>
                        <input type="radio" value="Почта России" {...register('delivery_method')} />
                        Почта России
                    </label>
                    <label className={deliveryMethod === 'СДЭК' ? 'active' : ''}>
                        <input type="radio" value="СДЭК" {...register('delivery_method')} />
                        СДЭК
                    </label>
                </div>

                {/* --- ДИНАМИЧЕСКИЙ БЛОК АДРЕСА --- */}
                {deliveryMethod === 'Почта России' && (
                    <div className="address-fields-container">
                        <p className="delivery-instructions">Укажите полный адрес для доставки Почтой России. Все поля, кроме квартиры, обязательны.</p>
                        <div className="form-field">
                            <input placeholder="Область, край или республика" {...register('post_region', { required: 'Укажите регион' })} className={`form-input ${errors.post_region ? 'invalid' : ''}`} maxLength={100} />
                            {errors.post_region && <p className="error-message">{errors.post_region.message}</p>}
                        </div>
                        <div className="form-field">
                            <input placeholder="Район" {...register('post_district', { required: 'Укажите район' })} className={`form-input ${errors.post_district ? 'invalid' : ''}`} maxLength={100} />
                            {errors.post_district && <p className="error-message">{errors.post_district.message}</p>}
                        </div>
                        <div className="form-field">
                            <input placeholder="Населенный пункт (город, село...)" {...register('post_city', { required: 'Укажите населенный пункт' })} className={`form-input ${errors.post_city ? 'invalid' : ''}`} maxLength={100} />
                            {errors.post_city && <p className="error-message">{errors.post_city.message}</p>}
                        </div>
                        <div className="form-grid">
                            <div className="form-field grid-full-width">
                                <input placeholder="Улица" {...register('post_street', { required: 'Укажите улицу' })} className={`form-input ${errors.post_street ? 'invalid' : ''}`} maxLength={150} />
                                {errors.post_street && <p className="error-message">{errors.post_street.message}</p>}
                            </div>
                            <div className="form-field">
                                <input placeholder="Дом" {...register('post_house', { required: 'Укажите номер дома' })} className={`form-input ${errors.post_house ? 'invalid' : ''}`} maxLength={10} />
                                {errors.post_house && <p className="error-message">{errors.post_house.message}</p>}
                            </div>
                            <div className="form-field">
                                <input placeholder="Квартира" {...register('post_apartment')} className="form-input" maxLength={10} />
                            </div>
                        </div>
                        <div className="form-field">
                            <input type="tel" placeholder="Почтовый индекс (6 цифр)" {...register('post_postcode', { required: 'Укажите индекс', pattern: { value: /^\d{6}$/, message: 'Индекс должен состоять из 6 цифр' } })} className={`form-input ${errors.post_postcode ? 'invalid' : ''}`} maxLength={6} />
                            {errors.post_postcode && <p className="error-message">{errors.post_postcode.message}</p>}
                        </div>
                    </div>
                )}

                {deliveryMethod === 'СДЭК' && (
                    <div className="address-fields-container">
                        <p className="delivery-instructions">Укажите город и полный адрес пункта выдачи СДЭК (улица и номер дома).</p>
                        <div className="form-field">
                            <input placeholder="Населенный пункт" {...register('cdek_city', { required: 'Укажите город' })} className={`form-input ${errors.cdek_city ? 'invalid' : ''}`} maxLength={100} />
                            {errors.cdek_city && <p className="error-message">{errors.cdek_city.message}</p>}
                        </div>
                        <div className="form-field">
                            <input placeholder="Адрес пункта выдачи (улица, дом)" {...register('cdek_office_address', { required: 'Укажите адрес ПВЗ' })} className={`form-input ${errors.cdek_office_address ? 'invalid' : ''}`} maxLength={255} />
                            {errors.cdek_office_address && <p className="error-message">{errors.cdek_office_address.message}</p>}
                        </div>
                    </div>
                )}
            </form>

            <div className="sticky-footer">
                <div className="order-summary">
                    <div className="summary-row final-total">
                        <span>Итого к оплате</span>
                        <span>{selectionInfo.final_total} ₽</span>
                    </div>
                </div>
                <button className="checkout-btn" onClick={handleSubmit(onSubmit)} disabled={!isValid}>
                    Заказать
                </button>
            </div>
        </div>
    );
};

export default CheckoutForm;