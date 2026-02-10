// main.js
const burger = document.querySelector(".burger");
const nav = document.getElementById("nav");
const heroTitle = document.querySelector(".hero h1");
const heroSubtitle = document.querySelector(".hero p");
const productsGrid = document.querySelector(".products .grid");

// State to hold all data from sheets
let allSections = [];
let allProducts = [];
let allCategories = [];
let allPriceTypes = [];
let allPrices = [];
let allImages = [];
let cart = [];

burger.addEventListener("click", () => {
  nav.classList.toggle("active");
  burger.classList.toggle("active");
  document.body.classList.toggle("menu-open");
});
 
// Helper para verificar si un campo es activo (true/activo/si/yes)
function isActive(val) {
    if (!val) return false;
    const s = String(val).toLowerCase().trim();
    return s === 'true' || s === 'activo' || s === 'si' || s === 'yes' || s === '1';
}

// ========================================
// LIGHTBOX GALLERY
// ========================================
function openLightbox(imageUrls, startIndex = 0) {
    if (!imageUrls || imageUrls.length === 0) return;

    // Remove existing lightbox if any
    const existingLightbox = document.querySelector('.lightbox-overlay');
    if (existingLightbox) {
        existingLightbox.remove();
    }

    let currentIndex = startIndex;

    const lightboxOverlay = document.createElement('div');
    lightboxOverlay.className = 'lightbox-overlay';

    const lightboxContent = document.createElement('div');
    lightboxContent.className = 'lightbox-content';

    const img = document.createElement('img');
    img.className = 'lightbox-image';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'lightbox-close';
    closeBtn.innerHTML = '&times;';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'lightbox-nav prev';
    prevBtn.innerHTML = '&#10094;';

    const nextBtn = document.createElement('button');
    nextBtn.className = 'lightbox-nav next';
    nextBtn.innerHTML = '&#10095;';

    function showImage(index) {
        if (index < 0 || index >= imageUrls.length) return;
        currentIndex = index;
        img.src = imageUrls[currentIndex];
        // Hide nav buttons if only one image
        const display = imageUrls.length > 1 ? 'block' : 'none';
        prevBtn.style.display = display;
        nextBtn.style.display = display;
    }

    closeBtn.onclick = () => lightboxOverlay.remove();
    lightboxOverlay.onclick = (e) => {
        if (e.target === lightboxOverlay) {
            lightboxOverlay.remove();
        }
    };

    prevBtn.onclick = () => showImage((currentIndex - 1 + imageUrls.length) % imageUrls.length);
    nextBtn.onclick = () => showImage((currentIndex + 1) % imageUrls.length);

    document.onkeydown = (e) => {
        if (e.key === 'Escape') lightboxOverlay.remove();
        if (e.key === 'ArrowLeft') prevBtn.click();
        if (e.key === 'ArrowRight') nextBtn.click();
    };

    lightboxContent.append(img, closeBtn, prevBtn, nextBtn);
    lightboxOverlay.appendChild(lightboxContent);
    document.body.appendChild(lightboxOverlay);

    showImage(currentIndex);
}

// Helper para convertir enlaces de Google Drive a enlaces directos de imagen
function convertDriveLink(url) {
    if (!url) return '';
    // Intenta extraer el ID del archivo de patrones comunes de Drive
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        // Usa lh3.googleusercontent.com para servir la imagen directamente
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    return url;
}

// Generic function to fetch and parse sheet data using gviz API
async function fetchSheetData(sheetName, gid) {
  const sheetId = config.sheetId;
  // IMPORTANT: The 'sheet' parameter is the NAME of the sheet tab.
  // Added headers=1 to try to force Google to recognize the header row
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${sheetName}&tqx=out:json&gid=${gid}&headers=1`;
  
  try {
    const res = await fetch(url);
    const text = await res.text();
    // The gviz API returns a JSONP-like response, we need to clean it to get pure JSON
    const jsonText = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonText);
    
    // Map columns to a more friendly object format using the labels from the first row
    let headers = data.table.cols.map(col => col.label ? col.label.toLowerCase().trim() : '');
    let rows = data.table.rows;

    // Fallback: If labels are empty (common issue), assume the first row contains headers
    const hasEmptyHeaders = headers.some(h => h === '');
    if (hasEmptyHeaders && rows.length > 0) {
        // Use the first row values as headers
        headers = rows[0].c.map(cell => cell ? (cell.v || '').toString().toLowerCase().trim() : '');
        // Remove the first row from data since it's actually headers
        rows = rows.slice(1);
    }

    const formattedRows = rows.map(row => {
        const rowData = {};
        // Handle cases where row.c might be null or shorter than headers
        if (row.c) {
          row.c.forEach((cell, index) => {
            const header = headers[index];
            if (header) {
                rowData[header] = cell ? cell.v : null;
            }
          });
        }
        return rowData;
    });
    return formattedRows;
  } catch (error) {
    console.error(`Error fetching data from sheet "${sheetName}":`, error);
    return [];
  }
}

// Renders the product cards for a given section
function renderProducts(sectionId) {
    productsGrid.innerHTML = ''; // Clear existing products
    
    if (!allProducts || allProducts.length === 0) {
        productsGrid.innerHTML = '<p style="color: #bbb; grid-column: 1 / -1; text-align: center;">Próximamente más equipos.</p>';
        return;
    }

    const sectionProducts = allProducts.filter(product => 
        product.seccion === sectionId && 
        isActive(product.activo)
    );

    if (sectionProducts.length === 0) {
        productsGrid.innerHTML = '<p style="color: #bbb; grid-column: 1 / -1; text-align: center;">No hay equipos disponibles para esta sección.</p>';
        return;
    }

    // Agrupar productos por categoría
    const groupedProducts = sectionProducts.reduce((acc, product) => {
        const categoryId = product.id_categoria || 'varios'; // Usamos id_categoria para agrupar
        if (!acc[categoryId]) {
            acc[categoryId] = [];
        }
        acc[categoryId].push(product);
        return acc;
    }, {});

    // Ordenar las categorías numéricamente por id_categoria
    const sortedCategoryIds = Object.keys(groupedProducts).sort((a, b) => {
        if (a === 'varios') return 1;
        if (b === 'varios') return -1;
        return Number(a) - Number(b);
    });

    sortedCategoryIds.forEach(categoryId => {
        const categoryData = allCategories.find(cat => cat.id_categoria == categoryId);
        const categoryDisplayName = categoryData ? categoryData.titulo : categoryId;

        // Crear y añadir el título de la categoría a la grilla
        const categoryTitle = document.createElement('h3');
        categoryTitle.className = 'category-title';
        categoryTitle.textContent = categoryDisplayName;
        productsGrid.appendChild(categoryTitle);

        // Renderizar los productos de esta categoría
        groupedProducts[categoryId].forEach(product => {
            // 1. Buscar todas las imágenes activas del producto
            const productImages = allImages
                .filter(img => img.id_producto == product.id_producto && isActive(img.activo))
                .map(img => convertDriveLink(img.url_imagen))
                .filter(Boolean); // Filtra nulos o vacíos

            // Usar la imagen de la columna 'imagen' como fallback si no hay nada en la hoja 'imagenes'
            if (productImages.length === 0 && product.imagen) {
                const fallbackImage = convertDriveLink(product.imagen);
                if (fallbackImage) {
                    productImages.push(fallbackImage);
                }
            }
            
            const placeholderImage = 'https://via.placeholder.com/400x300/0f0f16/1c1c26?text=NEON+SOUND';
            const finalImages = productImages.length > 0 ? productImages : [placeholderImage];

            // 2. Generar HTML para el slider de imágenes
            let imageSliderHTML = '';
            if (finalImages.length > 1) {
                const slides = finalImages.map((url, index) => 
                    `<img src="${url}" alt="${product.nombre || ''}" class="slide ${index === 0 ? 'active' : ''}" data-index="${index}">`
                ).join('');
                imageSliderHTML = `
                    <div class="card-image-container slider-active">
                        ${slides}
                        <button class="slider-btn prev">&#10094;</button>
                        <button class="slider-btn next">&#10095;</button>
                    </div>
                `;
            } else {
                imageSliderHTML = `
                    <div class="card-image-container">
                        <img src="${finalImages[0]}" alt="${product.nombre || ''}" class="slide active" data-index="0">
                    </div>
                `;
            }

            // 3. Buscar precios activos y sus tipos
            const productPrices = allPrices.filter(p => p.id_producto == product.id_producto && isActive(p.activo));
            
            let priceHTML = '';
            if (productPrices.length > 0) {
                // Si hay precios en la nueva tabla, los mostramos todos
                const pricesList = productPrices.map(p => {
                    const type = allPriceTypes.find(t => t.id_tipo_precio == p.id_tipo_precio);
                    const typeName = type ? type.nombre : ''; // Ej: Alquiler
                    return `<div class="price-row"><span class="price-amount">Bs ${p.precio}</span> <span class="price-label">${typeName}</span></div>`;
                }).join('');
                
                priceHTML = `<div class="price-list">${pricesList}</div>`;
            } else {
                // Fallback a la lógica anterior si no hay precios en la tabla nueva
                const oldPrice = product.precio ? `Bs ${product.precio}` : 'A consultar';
                const oldSuffix = product.precio ? '<span class="price-label">/día</span>' : '';
                priceHTML = `<div class="price-single"><span class="price-amount">${oldPrice}</span> ${oldSuffix}</div>`;
            }

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                ${imageSliderHTML}
                <div class="card-content">
                    <h3>${product.nombre || 'Nombre no disponible'}</h3>
                    <p>${product.descripcion || 'Descripción no disponible.'}</p>
                    <div class="card-footer">${priceHTML}<button class="btn-add-cart" data-id="${product.id_producto}">Agregar +</button></div>
                </div>
            `;
            productsGrid.appendChild(card);

            // 4. Añadir funcionalidad al slider y lightbox para esta tarjeta
            const imageContainer = card.querySelector('.card-image-container');
            if (imageContainer) {
                // Lightbox click
                imageContainer.addEventListener('click', (e) => {
                    // No abrir lightbox si se hace clic en los botones del slider
                    if (e.target.classList.contains('slider-btn')) return;
                    
                    const activeSlide = imageContainer.querySelector('.slide.active');
                    const startIndex = activeSlide ? parseInt(activeSlide.dataset.index, 10) : 0;
                    openLightbox(finalImages, startIndex);
                });

                // Slider functionality
                const prevBtn = card.querySelector('.slider-btn.prev');
                const nextBtn = card.querySelector('.slider-btn.next');
                
                if (prevBtn && nextBtn) {
                    const slides = card.querySelectorAll('.slide');
                    let currentIndex = 0;

                    const updateSlider = () => slides.forEach((slide, index) => slide.classList.toggle('active', index === currentIndex));

                    prevBtn.addEventListener('click', () => {
                        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
                        updateSlider();
                    });

                    nextBtn.addEventListener('click', () => {
                        currentIndex = (currentIndex + 1) % slides.length;
                        updateSlider();
                    });
                }
            }
        });
    });

    // Event delegation for Add to Cart buttons
    productsGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-add-cart')) {
            openProductModal(e.target.dataset.id);
        }
    });
}

// Renders the main content (hero + products) for a given section
function renderContent(sectionId) {
    const sectionData = allSections.find(s => s.seccion === sectionId);
    if (!sectionData) {
        console.error(`No data found for section: ${sectionId}`);
        heroTitle.textContent = "Sección no encontrada";
        heroSubtitle.textContent = "Por favor, selecciona una opción del menú.";
        productsGrid.innerHTML = '';
        return;
    }

    // Update hero section and page title
    heroTitle.textContent = sectionData.nombre;
    heroSubtitle.textContent = sectionData.descripcion;
    document.title = `${sectionData.nombre} | Neon Sound`;

    // Update active link in navigation
    const navLinks = nav.querySelectorAll('a');
    navLinks.forEach(link => {
        if (link.dataset.section === sectionId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Render products for this section
    renderProducts(sectionId);
}

// ========================================
// CART LOGIC
// ========================================
const cartOverlay = document.getElementById('cart-overlay');
const cartToggle = document.getElementById('cart-toggle');
const closeCart = document.getElementById('close-cart');
const cartItemsContainer = document.getElementById('cart-items');
const cartCount = document.getElementById('cart-count');
const checkoutBtn = document.getElementById('checkout-btn');
const contactSelect = document.getElementById('contact-select');
const productModal = document.getElementById('product-modal');
const modalSteps = document.querySelectorAll('.modal-step');
const stepIndicator = document.getElementById('step-indicator');
const modalBackBtn = document.getElementById('modal-back-btn');
const modalNextBtn = document.getElementById('modal-next-btn');
const closeModalBtn = document.getElementById('close-product-modal');

let currentStep = 1;
let totalSteps = 4; // Ahora son 4 pasos por defecto (incluyendo mapa)
let selectedDatesSet = new Set(); // Almacena fechas únicas seleccionadas
let selectionData = {}; // To hold data across steps
let calendarViewDate = new Date(); // Fecha actual del calendario visual
let mapInstance = null;
let mapMarker = null;

function toggleCart() {
    cartOverlay.classList.toggle('open');
}

cartToggle.addEventListener('click', toggleCart);
closeCart.addEventListener('click', toggleCart);
cartOverlay.addEventListener('click', (e) => {
    if (e.target === cartOverlay) toggleCart();
});

// ========================================
// MULTI-STEP MODAL LOGIC
// ========================================
function goToStep(stepNumber) {
    currentStep = stepNumber;
    // Hide all steps
    modalSteps.forEach(step => step.style.display = 'none');
    // Show current step
    const currentStepElement = document.getElementById(`modal-step-${currentStep}`);
    if (currentStepElement) {
        currentStepElement.style.display = 'block';
    }
    
    // Si entramos al paso del mapa, redimensionar para evitar gris
    if (currentStep === 3) {
        setTimeout(() => { if(mapInstance) mapInstance.invalidateSize(); }, 100);
    }

    // Update indicator
    stepIndicator.textContent = `Paso ${currentStep} de ${totalSteps}`;

    // Update buttons
    modalBackBtn.style.display = currentStep > 1 ? 'block' : 'none';
    modalNextBtn.textContent = currentStep === 4 ? 'Confirmar y Agregar' : 'Siguiente';
}

function renderConfirmationStep() {
    const summaryContainer = document.getElementById('confirmation-summary');
    const { product, priceDetails, dates, location } = selectionData;

    let dateText = 'No aplica';
    let datesHtml = '';

    if (dates && dates.length > 0) {
        // Agrupar fechas por mes
        const datesByMonth = dates.reduce((acc, dateStr) => {
            const [y, m, d] = dateStr.split('-');
            const monthKey = `${y}-${m}`;
            if (!acc[monthKey]) acc[monthKey] = [];
            acc[monthKey].push(d);
            return acc;
        }, {});

        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

        datesHtml = Object.entries(datesByMonth).map(([key, days]) => {
            const [y, m] = key.split('-');
            const monthName = monthNames[parseInt(m) - 1];
            return `<div><strong>${monthName} ${y}:</strong> ${days.join(', ')}</div>`;
        }).join('');
    }
    
    const locationText = location ? `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}` : 'No seleccionada';

    summaryContainer.innerHTML = `
        <div class="summary-item"><strong>Producto:</strong><span>${product.nombre}</span></div>
        <div class="summary-item"><strong>Opción:</strong><span>${priceDetails.type} - Bs ${priceDetails.amount}</span></div>
        <div class="summary-item"><strong>Fechas:</strong><span>${datesHtml || dateText}</span></div>
        <div class="summary-item"><strong>Ubicación:</strong><span>${locationText}</span></div>
    `;
}

// ========================================
// CALENDAR LOGIC
// ========================================
function renderCalendar(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    
    // Header
    const header = document.createElement('div');
    header.className = 'calendar-header';
    
    const prevBtn = document.createElement('button');
    prevBtn.className = 'calendar-nav-btn';
    prevBtn.innerHTML = '&#10094;';
    prevBtn.onclick = () => {
        calendarViewDate.setMonth(month - 1);
        renderCalendar(containerId);
    };
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'calendar-nav-btn';
    nextBtn.innerHTML = '&#10095;';
    nextBtn.onclick = () => {
        calendarViewDate.setMonth(month + 1);
        renderCalendar(containerId);
    };
    
    const title = document.createElement('div');
    title.className = 'calendar-month-year';
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    title.textContent = `${monthNames[month]} ${year}`;
    
    header.append(prevBtn, title, nextBtn);
    container.appendChild(header);
    
    // Grid
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';
    
    // Day names
    const days = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
    days.forEach(d => {
        const el = document.createElement('div');
        el.className = 'calendar-day-name';
        el.textContent = d;
        grid.appendChild(el);
    });
    
    // Days logic
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Empty slots
    for (let i = 0; i < firstDay; i++) {
        const el = document.createElement('div');
        el.className = 'calendar-day empty';
        grid.appendChild(el);
    }
    
    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
        const el = document.createElement('div');
        el.className = 'calendar-day';
        el.textContent = i;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of today for accurate comparison
        
        // Calcular fecha mínima basada en dias_minimos
        const minDate = new Date(today);
        const minDaysRequired = selectionData.priceDetails ? (selectionData.priceDetails.minDays || 0) : 0;
        minDate.setDate(today.getDate() + parseInt(minDaysRequired));

        const dayDate = new Date(year, month, i);
        // Format YYYY-MM-DD
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        if (selectedDatesSet.has(dateStr)) {
            el.classList.add('selected');
        }
        
        if (dayDate < minDate) {
            el.classList.add('disabled');
        } else {
            el.onclick = () => {
                if (selectionData.allowMultipleDates) {
                    // Multi-select logic
                    if (selectedDatesSet.has(dateStr)) selectedDatesSet.delete(dateStr);
                    else selectedDatesSet.add(dateStr);
                } else {
                    // Single-select logic
                    selectedDatesSet.clear();
                    selectedDatesSet.add(dateStr);
                }
                renderCalendar(containerId); // Re-render to update styles
            };
        }
        
        grid.appendChild(el);
    }
    container.appendChild(grid);
}

// ========================================
// MAP LOGIC
// ========================================
function initMap() {
    if (mapInstance) return; // Ya inicializado

    // Coordenadas Cochabamba
    const cochabambaCoords = [-17.3935, -66.1570];
    
    mapInstance = L.map('map-container').setView(cochabambaCoords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance);

    // Marcador inicial
    mapMarker = L.marker(cochabambaCoords, {draggable: true}).addTo(mapInstance);
    
    // Actualizar estado al mover
    mapMarker.on('moveend', function(e) {
        const coord = e.target.getLatLng();
        document.getElementById('location-status').textContent = `Ubicación: ${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}`;
    });
    
    mapInstance.on('click', function(e) {
        mapMarker.setLatLng(e.latlng);
        document.getElementById('location-status').textContent = `Ubicación: ${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
    });
}

closeModalBtn.addEventListener('click', () => productModal.classList.remove('open'));

function openProductModal(productId) {
    // Reset state
    selectionData = {};
    selectedDatesSet.clear();
    calendarViewDate = new Date();
    
    // Reset map marker if exists
    if (mapInstance && mapMarker) {
        mapMarker.setLatLng([-17.3935, -66.1570]);
    }

    const product = allProducts.find(p => p.id_producto == productId);
    if (!product) return;

    selectionData.product = product;
    document.getElementById('modal-product-name').textContent = product.nombre;
    
    const optionsContainer = document.getElementById('modal-options');
    optionsContainer.innerHTML = '';

    // Contenedor para las fechas (se inyectará dinámicamente)
    let dateInputsHTML = '';

    // Buscar precios específicos
    const productPrices = allPrices.filter(p => p.id_producto == product.id_producto && isActive(p.activo));

    if (productPrices.length > 0) {
        productPrices.forEach((p, index) => {
            const type = allPriceTypes.find(t => t.id_tipo_precio == p.id_tipo_precio);
            const typeName = type ? type.nombre : 'Estándar';
            // Verificamos si este tipo requiere retorno (por defecto true si no existe la columna)
            const requiresReturn = type && type.requiere_retorno ? isActive(type.requiere_retorno) : true;
            const minDays = type ? (type.dias_minimos || type['dias minimos'] || 0) : 0;
            
            const html = `
                <label>
                    <input type="radio" name="price_option" value="${index}" data-return="${requiresReturn}" data-min-days="${minDays}" class="price-option-input" ${index === 0 ? 'checked' : ''} style="display:none;">
                    <div class="price-option-label">
                        <span style="font-weight:600; color:var(--gold);">${typeName}</span>
                        <span>Bs ${p.precio}</span>
                    </div>
                </label>
            `;
            optionsContainer.innerHTML += html;
        });
    } else {
        // Fallback precio simple
        const price = product.precio ? `Bs ${product.precio}` : 'A consultar';
        const html = `
            <label>
                <input type="radio" name="price_option" value="default" data-return="true" data-min-days="0" class="price-option-input" checked style="display:none;">
                <div class="price-option-label">
                    <span style="font-weight:600; color:var(--gold);">Precio Base</span>
                    <span>${price}</span>
                </div>
            </label>
        `;
        optionsContainer.innerHTML += html;
    }

    // Lógica para mostrar/ocultar calendario según la opción seleccionada
    const radios = optionsContainer.querySelectorAll('input[name="price_option"]');
    const toggleDates = () => {
        const selected = optionsContainer.querySelector('input[name="price_option"]:checked');
        if (selected && selected.dataset.return === 'true') {
            // El calendario se mostrará en el paso 2, aquí solo marcamos que se requiere
        } else {
            // No requiere calendario
        }
    };

    radios.forEach(r => r.addEventListener('change', toggleDates));
    
    // Resetear selección al abrir modal
    selectedDatesSet.clear();
    calendarViewDate = new Date();
    
    // Show modal and go to first step
    productModal.classList.add('open');
    goToStep(1);
    toggleDates(); // Call after going to step 1 to ensure elements are visible
    
    // Init map if not already done
    setTimeout(initMap, 500);
}

modalNextBtn.addEventListener('click', () => {
    if (currentStep === 1) {
        // --- From Step 1 to 2/3 ---
        const selectedOption = document.querySelector('input[name="price_option"]:checked');
        if (!selectedOption) {
            alert("Por favor, selecciona una opción de precio.");
            return;
        }

        // Capture minDays from data attribute
        const minDays = parseInt(selectedOption.dataset.minDays) || 0;

        // Store price data
        if (selectedOption.value === 'default') {
            selectionData.priceDetails = { type: 'Base', amount: selectionData.product.precio || 'A consultar', minDays: 0 };
        } else {
            const index = parseInt(selectedOption.value);
            const productPrices = allPrices.filter(p => p.id_producto == selectionData.product.id_producto && isActive(p.activo));
            const p = productPrices[index];
            const type = allPriceTypes.find(t => t.id_tipo_precio == p.id_tipo_precio);
            selectionData.priceDetails = { type: type ? type.nombre : 'Estándar', amount: p.precio, minDays: minDays };
        }
        
        const requiresReturn = selectedOption.dataset.return === 'true';
        selectionData.allowMultipleDates = requiresReturn;

        goToStep(2);
        // Renderizar calendario al entrar al paso 2
        renderCalendar('calendar-container');
    } else if (currentStep === 2) {
        // --- From Step 2 (Calendar) to 3 (Map) ---
        if (selectedDatesSet.size === 0) {
            alert("Por favor, selecciona al menos una fecha.");
            return;
        }
        selectionData.dates = Array.from(selectedDatesSet).sort();
        goToStep(3);
    } else if (currentStep === 3) {
        // --- From Step 3 (Map) to 4 (Confirmation) ---
        if (mapMarker) {
            selectionData.location = mapMarker.getLatLng();
        }
        renderConfirmationStep();
        goToStep(4);
    } else {
        // --- Final Confirmation Step (4) ---
        cart.push(selectionData);
        updateCartUI();
        productModal.classList.remove('open');
        toggleCart(); // Show cart with new item
    }
});

modalBackBtn.addEventListener('click', () => {
    if (currentStep > 1) {
        goToStep(currentStep - 1);
    }
});

function renderConfirmationStep() {
    const summaryContainer = document.getElementById('confirmation-summary');
    const { product, priceDetails, dates } = selectionData;

    let dateText = 'No aplica';
    let datesHtml = '';

    if (dates && dates.length > 0) {
        // Agrupar fechas por mes
        const datesByMonth = dates.reduce((acc, dateStr) => {
            const [y, m, d] = dateStr.split('-');
            const monthKey = `${y}-${m}`;
            if (!acc[monthKey]) acc[monthKey] = [];
            acc[monthKey].push(d);
            return acc;
        }, {});

        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

        datesHtml = Object.entries(datesByMonth).map(([key, days]) => {
            const [y, m] = key.split('-');
            const monthName = monthNames[parseInt(m) - 1];
            return `<div><strong>${monthName} ${y}:</strong> ${days.join(', ')}</div>`;
        }).join('');
    }

    summaryContainer.innerHTML = `
        <div class="summary-item"><strong>Producto:</strong><span>${product.nombre}</span></div>
        <div class="summary-item"><strong>Opción:</strong><span>${priceDetails.type} - Bs ${priceDetails.amount}</span></div>
        <div class="summary-item"><strong>Fechas:</strong><span>${datesHtml || dateText}</span></div>
    `;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function updateCartUI() {
    cartCount.textContent = cart.length;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-msg">Tu carrito está vacío.</p>';
        return;
    }

    cartItemsContainer.innerHTML = '';
    cart.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        const dateInfo = item.dates && item.dates.length > 0
            ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">📅 ${item.dates.length} día(s)</div>`
            : '';
        const locInfo = item.location ? `<div style="font-size:0.75rem; color:var(--text-muted);">📍 Cochabamba</div>` : '';
        div.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.product.nombre}</h4>
                <small style="color:var(--gold);">${item.priceDetails.type}: Bs ${item.priceDetails.amount}</small>
                ${dateInfo}
                ${locInfo}
            </div>
            <button class="cart-item-remove" onclick="removeFromCart(${index})">&times;</button>
        `;
        cartItemsContainer.appendChild(div);
    });
}

// Load contacts from config
function loadContacts() {
    if (config.contacts && config.contacts.length > 0) {
        contactSelect.innerHTML = config.contacts.map(c => 
            `<option value="${c.number}">${c.name}</option>`
        ).join('');
    }
}

checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) {
        alert("Agrega productos al carrito primero.");
        return;
    }

    const selectedNumber = contactSelect.value;

    if (!selectedNumber) {
        alert("Error de configuración: No hay número de contacto.");
        return;
    }

    // Build WhatsApp Message
    let message = `Hola *Sonido Unicornio*, quisiera cotizar los siguientes equipos:\n\n`;
    
    cart.forEach(item => {
        message += `🔹 *${item.product.nombre}*\n`;
        message += `   - Opción: ${item.priceDetails.type} (Bs ${item.priceDetails.amount})\n`;
        if (item.dates && item.dates.length > 0) {
            const formattedDates = item.dates.map(d => {
                const [y, m, d_day] = d.split('-');
                return `${d_day}/${m}`;
            }).join(', ');
            message += `   - Fechas: ${formattedDates}\n`;
        }
        if (item.location) {
            message += `   - Ubicación: https://www.google.com/maps/search/?api=1&query=${item.location.lat},${item.location.lng}\n`;
        }
        message += `\n`;
    });

    message += `\nQuedo atento a su respuesta.`;

    const url = `https://wa.me/${selectedNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
});

// Main function to initialize the app
async function initializeApp() {
    heroTitle.textContent = "Cargando...";
    productsGrid.innerHTML = '<p style="color: #bbb; grid-column: 1 / -1; text-align: center;">Cargando equipos...</p>';

    // Fetch all data in parallel.
    // gid=0 is for your first sheet ('secciones').
    // You need to create a THIRD sheet ('categorias') and find its GID.
    const [sections, products, categories, priceTypes, prices, images] = await Promise.all([
        fetchSheetData('secciones', '0'),
        fetchSheetData('productos', '1891333790'), // <-- GID de tu hoja "productos"
        fetchSheetData('categorias', '234567890'), // <-- REEMPLAZA ESTO con el GID de "categorias"
        fetchSheetData('tipo_precios', 'GID_TIPOS_PRECIO'), // <-- REEMPLAZA con GID de "tipos_de_precio"
        fetchSheetData('precios', 'GID_PRECIOS'), // <-- REEMPLAZA con GID de "precios"
        fetchSheetData('imagenes', 'GID_IMAGENES') // <-- REEMPLAZA con GID de "imagenes"
    ]);

    allSections = sections;
    allProducts = products;
    allCategories = categories;
    allPriceTypes = priceTypes;
    allPrices = prices;
    allImages = images;

    // Initialize contacts
    loadContacts();

    // Render navigation
    nav.innerHTML = '';
    const activeSections = allSections.filter(s => isActive(s.activo));

    activeSections.forEach(item => {
      const link = document.createElement('a');
      link.href = `#${item.seccion}`; // Use hash for navigation state
      link.textContent = item.nombre;
      link.dataset.section = item.seccion; // Store section ID

      link.addEventListener('click', (e) => {
          e.preventDefault();
          const sectionId = e.target.dataset.section;
          history.pushState({ section: sectionId }, '', `#${sectionId}`);
          renderContent(sectionId);
          if (nav.classList.contains('active')) {
              nav.classList.remove('active');
              burger.classList.remove('active');
              document.body.classList.remove('menu-open');
          }
      });
      nav.appendChild(link);
    });

    // Determine initial section to render
    const initialSectionId = window.location.hash.substring(1);
    if (initialSectionId && activeSections.some(s => s.seccion === initialSectionId)) {
        renderContent(initialSectionId);
    } else if (activeSections.length > 0) {
        const defaultSectionId = activeSections[0].seccion;
        history.replaceState(null, '', `#${defaultSectionId}`);
        renderContent(defaultSectionId);
    } else {
        heroTitle.textContent = "No hay secciones activas";
        heroSubtitle.textContent = "Configura las secciones en Google Sheets.";
        productsGrid.innerHTML = '';
    }
}

// Handle browser back/forward navigation
window.addEventListener('popstate', (e) => {
    // Find the section from the URL hash if state is not available
    const sectionId = window.location.hash.substring(1);
    const activeSections = allSections.filter(s => isActive(s.activo));

    if (sectionId && activeSections.some(s => s.seccion === sectionId)) {
        renderContent(sectionId);
    } else if (activeSections.length > 0) {
        renderContent(activeSections[0].seccion);
    }
});

// Start the application
initializeApp();