# تغییرات امنیتی: لاگین توکن‌محور (JWT)

## چیکار کردم؟
مشکل اصلی این بود که `cart.py` و `favorites.py` مستقیماً `user_id` رو از URL یا body
می‌گرفتن و بهش اعتماد می‌کردن — یعنی هرکسی می‌تونست با عوض کردن `user_id` توی
درخواست، سبد خرید یا علاقه‌مندی‌های یک نفر دیگه رو ببینه/حذف کنه (IDOR).

الان:
1. موقع `login` یا `register`، سرور یک **JWT امضاشده** برمی‌گردونه که `user_id`
   داخلش قرار داره.
2. توی هر route محافظت‌شده (`cart`, `favorites`, `/auth/me`) دیگه از URL یا body
   دنبال `user_id` نمی‌گردیم؛ به‌جاش از هدر `Authorization: Bearer <token>`
   خونده و verify میشه، و `user_id` واقعی از **داخل توکن** استخراج میشه.
3. حتی اگه کلاینت دستکاری بشه و `user_id` جعلی بفرسته، دیگه تاثیری نداره چون
   دیگه اصلاً از کلاینت گرفته نمیشه.

## فایل‌های تغییریافته / جدید
- `app/core/config.py` — اضافه شدن `JWT_SECRET` و تنظیمات مربوطه
- `app/core/security.py` — اضافه شدن `create_access_token` و `decode_access_token`
- `app/api/deps.py` **(جدید)** — dependency به اسم `get_current_user_id` که توکن رو verify می‌کنه
- `app/api/auth.py` — لاگین/ثبت‌نام حالا توکن برمی‌گردونن + یک route جدید `/auth/me`
- `app/api/cart.py` — همه‌ی route ها از `get_current_user_id` استفاده می‌کنن، `user_id` از مسیر حذف شد
- `app/api/favorites.py` — همینطور
- `app/schemas/user.py` — اضافه شدن `TokenResponse`
- `app/schemas/cart.py` — `user_id` از `CartItemCreate` حذف شد
- `app/schemas/favorite.py` — `user_id` از `FavoriteCreate` حذف شد
- `app/repositories/user_repository.py` — اضافه شدن متد `get_by_id`

## کارهایی که باید خودت انجام بدی

### ۱. نصب پکیج JWT
```bash
pip install pyjwt
```
(اگه `requirements.txt` داری، `pyjwt` رو بهش اضافه کن)

### ۲. تنظیم `.env`
یک خط به فایل `.env` اضافه کن:
```
JWT_SECRET=<یک رشته تصادفی طولانی>
```
برای ساختنش:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```
⚠️ بدون این مقدار، سرور موقع بالا اومدن خطا می‌ده (عمداً همینطور طراحی شده تا یادت نره تنظیمش کنی).

### ۳. تغییرات لازم توی فرانت‌اند
API های زیر عوض شدن، باید فرانت‌اند رو هم آپدیت کنی:

| قبل | الان |
|---|---|
| `POST /auth/login` → `{id, full_name, phone}` | `POST /auth/login` → `{access_token, token_type, user}` |
| `GET /cart/{user_id}` | `GET /cart/` + هدر `Authorization: Bearer <token>` |
| `POST /cart/` با `user_id` توی body | `POST /cart/` بدون `user_id`، فقط با هدر توکن |
| `PUT/DELETE /cart/{user_id}/{product_id}` | `PUT/DELETE /cart/{product_id}` + هدر توکن |
| مشابه برای `/favorites/...` | مشابه برای `/favorites/...` |

بعد از لاگین، توکن رو یه‌جایی نگه دار (ترجیحاً `httpOnly cookie`؛ اگه فعلاً
localStorage استفاده می‌کنی حداقل کار می‌کنه ولی در برابر XSS ضعیف‌تره) و توی
هر request بفرست:
```js
fetch("/cart/", {
  headers: { "Authorization": `Bearer ${token}` }
})
```

### ۴. تست کن
- لاگین کن → توکن بگیر
- با یه توکن معتبر ولی دستکاری‌شده (یا بدون توکن) سعی کن `/cart/` رو بزنی → باید 401 بگیری
- مطمئن شو سبد خرید کاربر A با توکن کاربر B قابل دیدن نیست

## نکته
`app/api/customers.py` و پنل ادمین (`/admin`, `/auth/users`) رو دست نزدم چون
به نظر می‌رسید بخش مدیریتی جداست، نه بخش لاگین مشتری. اگه اونجاها هم باید
محافظت بشن (مثلاً یک ادمین جدا با نقش/role) بگو تا اون بخش رو هم اضافه کنم.
