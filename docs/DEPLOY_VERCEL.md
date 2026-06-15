# Hướng dẫn Deploy Fake Temple Run lên Vercel

## Tổng quan các cách

| Cách | Chi phí | Độ khó | Giới hạn file | Khuyến nghị |
|------|---------|--------|---------------|-------------|
| **Cách 1**: Cloudflare R2 + Vercel | Miễn phí | Trung bình | Không | ⭐ **Khuyên dùng** |
| **Cách 2**: Vercel Blob | ~$0.01/GB/tháng | Dễ | Không | Thay thế cho R2 |
| **Cách 3**: Vercel Pro | $20/tháng | Dễ | 30MB/file | Đắt, không cần |

---

## Trước khi bắt đầu

### Kiểm tra dung lượng file GLB

```bash
# Xem kích thước từng file trong dist/assets
Get-ChildItem -Path "dist/assets" -Filter "*.glb" | ForEach-Object {
    "$($_.Name): $([math]::Round($_.Length / 1MB, 2)) MB"
}
```

### Tạo repo GitHub

```bash
# Nếu chưa có repo
git init
git add .
git commit -m "Initial commit"
gh repo create fake-temple-run --public --push
# Hoặc dùng GitHub web để tạo repo rồi push lên
```

---

## Cách 1: Cloudflare R2 + Vercel (Khuyên dùng) ⭐

### Ưu điểm
- Miễn phí 10GB storage
- Không giới hạn bandwidth
- Custom domain miễn phí
- Tốc độ nhanh toàn cầu

### Nhược điểm
- Cần thêm bước upload GLB thủ công
- Cần cấu hình CORS

### Bước 1.1: Tạo Cloudflare Account

1. Vào https://dash.cloudflare.com
2. Đăng ký/Đăng nhập
3. Verify email (bắt buộc để dùng R2)

### Bước 1.2: Tạo R2 Bucket

1. Vào **R2 Object Storage** (menu bên trái)
2. Click **Create bucket**
3. Đặt tên: `fake-temple-run-assets`
4. Chọn region gần nhất (Tokyo, Singapore...)
5. Click **Create bucket**

### Bước 1.3: Upload file GLB lên R2

**Cách 1: Upload thủ công**
1. Mở bucket vừa tạo
2. Click **Upload** → Chọn toàn bộ file `.glb` trong `dist/assets`
3. Upload xong sẽ có danh sách file

**Cách 2: Dùng Wrangler (CLI)**

```bash
# Cài wrangler
npm install -g wrangler

# Login Cloudflare
wrangler login

# Upload thư mục assets
wrangler r2 object put fake-temple-run-assets/ --recursive ./dist/assets/
```

### Bước 1.4: Cấu hình CORS (quan trọng!)

1. Trong bucket → **Settings** → **CORS Policy**
2. Click **Edit CORS Policy**
3. Paste config sau:

```json
[
    {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedHeaders": ["*"],
        "MaxAgeSeconds": 3600
    }
]
```

### Bước 1.5: Thêm Custom Domain (miễn phí)

1. Trong bucket → **Settings** → **Custom Domains**
2. Click **Add custom domain**
3. Nhập: `assets.tenmien.com` (VD: `assets.yoursite.com`)
4. Cloudflare sẽ tạo CNAME record tự động
5. **Cần có domain** đã add vào Cloudflare

**Nếu không có domain**: Dùng URL mặc định:
- Format: `https://pub-xxx.r2.dev/fake-temple-run-assets/`
- (Không cần custom domain, nhưng URL dài hơn)

### Bước 1.6: Cập nhật Config.js

```javascript
// src/Config.js
PATH_ASSETS: 'https://assets.tenmien.com/',  // URL R2 của bạn
```

### Bước 1.7: Deploy lên Vercel

```bash
# Cài Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd fake-temple-run
vercel --prod
```

**Hoặc qua GitHub**:
1. Push code lên GitHub
2. Vào https://vercel.com
3. Click **Add New Project**
4. Import repo
5. Deploy

### Bước 1.8: Update Assets URL (nếu dùng production)

Mỗi lần build mới, cần upload lại GLB lên R2:

```bash
# Build
npm run build

# Upload lại assets
wrangler r2 object put fake-temple-run-assets/ --recursive ./dist/assets/
```

---

## Cách 2: Vercel Blob Storage

### Ưu điểm
- Tích hợp sẵn với Vercel
- Không cần service bên ngoài
- Tự động deploy cùng project

### Nhược điểm
- Có phí nhỏ (~$0.01/GB/tháng)
- Cần Vercel Pro cho Blob

### Bước 2.1: Nâng cấp Vercel Pro

1. Vào https://vercel.com/dashboard
2. Click **Upgrade** → Chọn **Pro** ($20/tháng)
3. Hoặc dùng **Pay as you go**

### Bước 2.2: Tạo Blob Storage

```bash
# Cài vercel CLI
npm i -g vercel

# Tạo blob
vercel blob add --yes
```

Hoặc qua dashboard:
1. Vào Project → **Storage** → **Create**
2. Chọn **Vercel Blob**
3. Đặt tên: `game-assets`
4. Chọn **Production**

### Bước 2.3: Upload file

```bash
# Upload thư mục assets
vercel blob upload --input ./dist/assets/ --destination /assets/
```

### Bước 2.4: Lấy URL

```bash
vercel blob list
```

Sẽ hiển thị URL dạng:
```
https://xxx.public.blob.vercel-storage.com/assets/player_v1.glb
```

### Bước 2.5: Cập nhật Config.js

```javascript
// src/Config.js
PATH_ASSETS: 'https://xxx.public.blob.vercel-storage.com/assets/',
```

### Bước 2.6: Deploy

```bash
vercel --prod
```

---

## Cách 3: Vercel Pro (Đắt nhất)

### Bước 3.1: Nâng cấp Pro

1. https://vercel.com/dashboard → **Upgrade to Pro**
2. $20/tháng hoặc $200/năm

### Bước 3.2: Tăng giới hạn file

Mặc định Vercel Pro cho phép **30MB/file**.

Nếu GLB > 30MB, cần thêm config:

```javascript
// vercel.json (tạo file nếu chưa có)
{
  "maxFileSizeAllowed": "50MiB"
}
```

### Bước 3.3: Push lên GitHub và Import

1. Push toàn bộ `dist/assets/` lên repo
2. Vercel sẽ tự deploy

### ⚠️ Cảnh báo

- Repo sẽ rất nặng (vài GB sau vài commit)
- Git bandwidth sẽ chậm
- **Không khuyến khích** cách này

---

## Cấu hình Vercel cho Project

### vercel.json

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        },
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    }
  ]
}
```

### .gitignore (bỏ qua dist nếu dùng CDN)

```gitignore
# Nếu dùng R2/Blob, không cần đẩy dist lên repo
# dist/
# !dist/index.html
```

---

## Kiểm tra sau khi Deploy

### 1. Mở DevTools → Network

```
https://your-app.vercel.app
```

### 2. Filter theo `.glb`

- Click **Preview** → chọn nhân vật
- Kiểm tra tab **Network**
- File GLB phải load từ R2/Blob URL, không phải local

### 3. Kiểm tra lỗi

```
Failed to load resource: net::ERR_NAME_NOT_RESOLVED
```
→ Lỗi URL assets, kiểm tra lại `PATH_ASSETS`

```
Access to fetch at 'https://...' from origin 'https://...' has been blocked by CORS policy
```
→ Lỗi CORS, kiểm tra lại bước 1.4

---

## Giải quyết vấn đề thường gặp

### Lỗi: 404 Not Found cho GLB

**Nguyên nhân**: URL assets sai

**Fix**:
```javascript
// Kiểm tra URL đúng
PATH_ASSETS: 'https://assets.tenmien.com/',  // Thêm / cuối!

// Verify: mở trình duyệt
https://assets.tenmien.com/player_v1.glb
```

### Lỗi: CORS

**Fix**:
```json
// R2 CORS Policy
[
    {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedHeaders": ["*"]
    }
]
```

### Lỗi: Slow loading

**Fix**:
- Nén GLB bằng gltf-pipeline:
```bash
npm install -g gltf-pipeline
gltf-pipeline -i input.glb -o output.glb -d
```
- Bật CDN cache cho assets

---

## Tóm tắt nhanh

```
┌─────────────────────────────────────────────────────────────┐
│                    RECOMMENDED FLOW                        │
├─────────────────────────────────────────────────────────────┤
│  1. Cloudflare R2 (miễn phí 10GB)                          │
│     └── Upload GLB → Custom Domain → URL                    │
│                                                             │
│  2. Vercel (deploy code)                                    │
│     └── vercel --prod                                       │
│                                                             │
│  3. Config.js                                               │
│     └── PATH_ASSETS = 'https://r2-url/'                     │
│                                                             │
│  4. Khi update GLB                                         │
│     └── Upload lại R2 → vercel --prod                       │
└─────────────────────────────────────────────────────────────┘
```

### Mã giả cho CI/CD (tự động)

```yaml
# .github/workflows/deploy.yml (nếu dùng GitHub Actions)
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install & Build
        run: |
          npm ci
          npm run build

      - name: Upload to R2
        run: |
          # Dùng Cloudflare Workers API hoặc rclone
          rclone copy ./dist/assets/ r2:bucket/assets/ --exclude "*.html"

      - name: Deploy to Vercel
        run: npx vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

---

## Checklist trước khi Deploy

- [ ] Code đã push lên GitHub
- [ ] Đã tạo R2 Bucket / Vercel Blob
- [ ] Đã upload toàn bộ GLB
- [ ] Đã cấu hình CORS
- [ ] Đã cập nhật `PATH_ASSETS` trong Config.js
- [ ] Đã chạy `npm run build`
- [ ] Đã deploy bằng `vercel --prod`
- [ ] Đã test trên production URL
