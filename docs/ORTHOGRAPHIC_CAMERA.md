# Phép chiếu song song (Orthographic Camera) trong Three.js

Tài liệu này giải thích **phép chiếu song song** được áp dụng trong `src/core/MenuPreview.js` — dùng để hiển thị nhân vật ở menu chính và subscreen Review.

---

## 1. Tổng quan

Trong Three.js có **2 loại camera chính**:

| Loại | Mục đích | Hiệu ứng |
|------|----------|----------|
| `PerspectiveCamera` (phép chiếu phối cảnh) | Game 3D, thế giới thực | Vật ở xa nhỏ hơn, vật ở gần lớn hơn |
| `OrthographicCamera` (phép chiếu song song) | UI, menu, blueprint, 2.5D | Vật giữ kích thước bất kể khoảng cách |

Trong dự án này, mình dùng `OrthographicCamera` để hiển thị **model nhân vật ở menu** — vì:
- Kích thước nhân vật **không bị méo** khi thay đổi kích thước canvas
- Không cần xử lý perspective, animation xoay/zoom đơn giản hơn
- Phù hợp với UI tĩnh (chỉ xoay model, không cần hiệu ứng chiều sâu)

---

## 2. Cú pháp khởi tạo

### 2.1. Khai báo

```javascript
import * as THREE from 'three';

const camera = new THREE.OrthographicCamera(left, right, top, bottom, near, far);
```

### 2.2. Tham số (6 tham số)

```javascript
new THREE.OrthographicCamera(
    left,    // Number  — biên trái  (x = -w/2)
    right,   // Number  — biên phải  (x = +w/2)
    top,     // Number  — biên trên  (y = +h/2)
    bottom,  // Number  — biên dưới  (y = -h/2)
    near,    // Number  — mặt phẳng cắt gần (z > near)
    far      // Number  — mặt phẳng cắt xa   (z < far)
);
```

| Tham số | Ý nghĩa |
|---------|----------|
| `left`, `right` | Biên trái/phải của khung nhìn (trục X) |
| `top`, `bottom` | Biên trên/dưới của khung nhìn (trục Y) |
| `near` | Vật ở z < `near` sẽ bị cắt (mặc định dương nếu camera nhìn về -Z) |
| `far` | Vật ở z > `far` sẽ bị cắt |

### 2.3. Ví dụ tối thiểu

```javascript
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
```

- Khung nhìn: từ `(-1, -1)` đến `(+1, +1)` ở mặt phẳng z=0
- Độ sâu nhìn được: từ z=0.1 đến z=100

---

## 3. Cách áp dụng trong dự án

### 3.1. Khởi tạo camera

Trong `MenuPreview.js`:

```javascript
// Line 219 (trong setupStage):
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
```

Khởi tạo với giá trị **tạm** `(-1, 1, 1, -1)` — sẽ được scale lại bằng `fitOrthoToCanvas()` ngay sau đó.

### 3.2. Scale camera theo kích thước canvas

```javascript
// Line 40-50:
const fitOrthoToCanvas = (cam, canvas) => {
    if (!cam || !canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const baseScale = 100;
    cam.left = -w / baseScale;
    cam.right = w / baseScale;
    cam.top = h / baseScale;
    cam.bottom = -h / baseScale;
    cam.updateProjectionMatrix();
};
```

**Công thức**:
- `left = -width / 100`
- `right = +width / 100`
- `top = +height / 100`
- `bottom = -height / 100`

**Ví dụ**: canvas `500px × 300px` → khung nhìn từ `(-5, -3)` đến `(+5, +3)`. 100 đơn vị thế giới = 1 pixel.

### 3.3. Đặt vị trí camera

Trong vòng lặp `tick()`:

```javascript
// Line ~260:
menuOrthoCam.position.set(0, 2, 4);
menuOrthoCam.lookAt(0, 0.8, 0);
```

- **Position `(0, 2, 4)`**: camera đặt ở trên cao 2 đơn vị, lùi ra 4 đơn vị
- **lookAt `(0, 0.8, 0)`**: nhìn về điểm giữa thân nhân vật (y = 0.8)
- Camera luôn **đối diện model** → model ở giữa khung nhìn

### 3.4. Gọi render

```javascript
menuRenderer.render(menuScene, menuOrthoCam);
```

---

## 4. Vì sao dùng `baseScale = 100`?

`baseScale` quyết định **tỉ lệ pixel ↔ đơn vị 3D**:

| baseScale | Ý nghĩa |
|-----------|----------|
| `1` | 1 pixel = 1 đơn vị 3D (model quá to) |
| `100` | 100 pixel = 1 đơn vị 3D (chuẩn cho nhân vật cao ~1.5-2 đơn vị) |
| `200` | Model nhỏ hơn nửa màn hình |

**Trong dự án**:
- Nhân vật cao khoảng **1.5-2 đơn vị** (GLB mặc định + `scale` từ config)
- Canvas preview ~**200-300px**
- → `baseScale = 100` cho khung nhìn vừa đủ, model hiển thị **~70% chiều cao canvas**

---

## 5. Resize handling

Khi cửa sổ thay đổi kích thước → phải **tính lại khung nhìn**:

```javascript
// Line 52-61:
const onResize = () => {
    if (menuCanvasEl && menuRenderer) {
        menuRenderer.setSize(menuCanvasEl.clientWidth, menuCanvasEl.clientHeight, false);
        fitOrthoToCanvas(menuOrthoCam, menuCanvasEl);
    }
    if (reviewCanvasEl && reviewRenderer) {
        reviewRenderer.setSize(reviewCanvasEl.clientWidth, reviewCanvasEl.clientHeight, false);
        fitOrthoToCanvas(reviewOrthoCam, reviewCanvasEl);
    }
};
window.addEventListener('resize', onResize);
```

Hai bước:
1. `renderer.setSize(w, h, false)` — resize canvas backing store
2. `fitOrthoToCanvas(cam, canvas)` — tính lại `left/right/top/bottom`

---

## 6. So sánh với PerspectiveCamera (nếu dùng)

```javascript
// Perspective (game 3D chính)
const persp = new THREE.PerspectiveCamera(60, w/h, 0.1, 1000);
persp.position.set(0, 5, 10);
persp.lookAt(0, 0, 0);

// Orthographic (menu preview)
const ortho = new THREE.OrthographicCamera(-5, 5, 3, -3, 0.1, 100);
ortho.position.set(0, 2, 4);
ortho.lookAt(0, 0.8, 0);
```

| Đặc tính | Perspective | Orthographic |
|----------|-------------|--------------|
| FOV / aspect | Có (`fov`, `aspect`) | Không (chỉ `left/right/top/bottom`) |
| Kích thước vật | Phụ thuộc z | Không phụ thuộc z |
| Hiệu ứng chiều sâu | Có (xa → nhỏ) | Không |
| Use case | Game world | UI, blueprint, 2.5D |

---

## 7. Tóm tắt luồng hoạt động

```
1. setupStage(canvas)
   └─ Tạo OrthographicCamera(-1, 1, 1, -1, 0.1, 100)  [tạm]

2. onResize() / fitOrthoToCanvas(cam, canvas)
   └─ Tính lại: left/right/top/bottom = ±w/100, ±h/100
   └─ updateProjectionMatrix()

3. tick() mỗi frame:
   └─ cam.position.set(0, 2, 4)
   └─ cam.lookAt(0, 0.8, 0)
   └─ renderer.render(scene, cam)
```

---

## 8. Code tham chiếu nhanh

Nếu muốn dùng lại cho mục đích khác (ví dụ: hiển thị thẻ bài, icon 3D trong HUD):

```javascript
// Tạo ortho camera cho 1 canvas bất kỳ
function createOrthoForCanvas(canvas) {
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    const fit = () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        const s = 100;
        cam.left = -w / s; cam.right = w / s;
        cam.top = h / s; cam.bottom = -h / s;
        cam.updateProjectionMatrix();
    };
    fit();
    window.addEventListener('resize', fit);
    return cam;
}

// Sử dụng
const cam = createOrthoForCanvas(myCanvas);
cam.position.set(0, 2, 4);
cam.lookAt(0, 0.8, 0);
renderer.render(scene, cam);
```

---

## 9. Lưu ý quan trọng

1. **Không được quên `updateProjectionMatrix()`** sau khi đổi `left/right/top/bottom` — nếu không camera sẽ dùng giá trị cũ.
2. **`near` và `far` phải dương**. Nếu vật nằm giữa 2 mặt phẳng này mới hiển thị.
3. **Model phải nằm trong khung `left/right/top/bottom`** ở mặt phẳng z = 0. Nếu model quá to → giảm `baseScale` (ví dụ `50` thay vì `100`).
4. **Auto-fit model**: trong `loadCharacterIntoGroup()`, dùng `Box3.setFromObject(root)` để tính bounding box rồi đặt đáy về `y = 0` (xem `MenuPreview.js:124-126`).
5. **Animation mixer** vẫn hoạt động bình thường với ortho camera — chỉ cần `mixer.update(delta)` mỗi frame.
