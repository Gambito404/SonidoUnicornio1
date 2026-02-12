// main.js
const sectionNav = document.getElementById("section-nav");
const heroNav = document.getElementById("hero-nav");
const productsGrid = document.querySelector(".products .grid");
const welcomeScreen = document.getElementById("welcome-screen");
const mainHeader = document.getElementById("main-header");
const mainContent = document.getElementById("main-content");

// State to hold all data from sheets
let allSections = [];
let allProducts = [];
let allCategories = [];
let allPriceTypes = [];
let allPrices = [];
let allImages = [];
let cart = [];

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

// Helper para generar Skeleton Loader HTML
function getSkeletonHTML(count = 6) {
    let html = '';
    for(let i=0; i<count; i++) {
        html += `
        <div class="skeleton-card">
            <div class="skeleton-image skeleton-shimmer"></div>
            <div class="skeleton-content">
                <div class="skeleton-text skeleton-shimmer" style="width: 70%; height: 24px;"></div>
                <div class="skeleton-text skeleton-shimmer" style="width: 100%;"></div>
                <div class="skeleton-text skeleton-shimmer" style="width: 100%;"></div>
                <div class="skeleton-text skeleton-shimmer" style="width: 40%; margin-top: auto;"></div>
            </div>
        </div>
        `;
    }
    return html;
}

// Renders the product cards for a given section
function renderProducts(sectionId) {
    productsGrid.innerHTML = ''; // Clear existing products
    const categoryNav = document.getElementById('category-nav');
    if (categoryNav) categoryNav.innerHTML = '';
    
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

    // Populate Category Nav
    if (categoryNav && sortedCategoryIds.length > 0) {
        sortedCategoryIds.forEach(categoryId => {
            const categoryData = allCategories.find(cat => cat.id_categoria == categoryId);
            const categoryDisplayName = categoryData ? categoryData.titulo : (categoryId === 'varios' ? 'Varios' : categoryId);
            
            const btn = document.createElement('button');
            btn.className = 'category-btn';
            btn.textContent = categoryDisplayName;
            btn.dataset.id = categoryId; // ID para el scroll spy
            btn.onclick = () => {
                const target = document.getElementById(`cat-${categoryId}`);
                if (target) {
                    // Ajuste dinámico del offset según el dispositivo
                    const isMobile = window.innerWidth < 1024;
                    const headerOffset = isMobile ? 220 : 100; 
                    const elementPosition = target.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                    window.scrollTo({ top: offsetPosition, behavior: "smooth" });
                }
            };
            categoryNav.appendChild(btn);
        });
    }

    sortedCategoryIds.forEach(categoryId => {
        const categoryData = allCategories.find(cat => cat.id_categoria == categoryId);
        const categoryDisplayName = categoryData ? categoryData.titulo : categoryId;

        // Crear y añadir el título de la categoría a la grilla
        const categoryTitle = document.createElement('h3');
        categoryTitle.className = 'category-title';
        categoryTitle.id = `cat-${categoryId}`;
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
            
            const placeholderImage = 'https://placehold.co/600x400/111/E5C15D?text=Sin+Imagen';
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
                    const typeName = type ? type.nombre : '';
                    const typeId = type ? type.id_tipo_precio : '';
                    return `<div class="price-row"><span class="price-amount">Bs ${p.precio}</span> <span class="price-label" data-type-id="${typeId}">${typeName}</span></div>`;
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
        // Delegación para el tooltip de descripción
        if (e.target.classList.contains('price-label') && e.target.dataset.typeId) {
            const typeId = e.target.dataset.typeId;
            showDescriptionTooltip(typeId);
        }
    });
}

// Renders the main content (hero + products) for a given section
async function renderContent(sectionId) {
    const sectionData = allSections.find(s => s.seccion === sectionId);
    if (!sectionData) {
        console.error(`No data found for section: ${sectionId}`);
        heroTitle.textContent = "Sección no encontrada";
        heroSubtitle.textContent = "Por favor, selecciona una opción del menú.";
        productsGrid.innerHTML = '';
        return;
    }


    // Update active button in section navigation
    const sectionBtns = sectionNav.querySelectorAll('.section-btn');
    sectionBtns.forEach(btn => {
        if (btn.dataset.section === sectionId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 1. Renderizar inmediatamente con datos en caché (si existen) para velocidad
    if (allProducts.length > 0) {
        renderProducts(sectionId);
    } else {
        // Solo en la primera carga mostramos un texto simple
        productsGrid.innerHTML = getSkeletonHTML(6);
    }

    // 2. Buscar datos frescos en segundo plano
    try {
        const [products, prices, images] = await Promise.all([
            fetchSheetData('productos', '1891333790'), 
            fetchSheetData('precios', 'GID_PRECIOS'), 
            fetchSheetData('imagenes', 'GID_IMAGENES') 
        ]);

        // 3. Comprobar si hay cambios reales antes de actualizar
        const hasChanged = JSON.stringify(products) !== JSON.stringify(allProducts) ||
                           JSON.stringify(prices) !== JSON.stringify(allPrices) ||
                           JSON.stringify(images) !== JSON.stringify(allImages);

        if (allProducts.length === 0 || hasChanged) {
            allProducts = products;
            allPrices = prices;
            allImages = images;

            // Solo re-renderizar si seguimos en la misma sección
            const activeBtn = sectionNav.querySelector('.section-btn.active');
            if (activeBtn && activeBtn.dataset.section === sectionId) {
                renderProducts(sectionId);
            }
        }
    } catch (error) {
        console.error("Error loading section data:", error);
        // Solo mostrar error si la grilla está vacía (fallo en carga inicial)
        if (!productsGrid.hasChildNodes() || productsGrid.innerHTML.includes('Cargando')) {
            productsGrid.innerHTML = '<p style="color: #bbb; grid-column: 1 / -1; text-align: center;">Error al cargar los datos. Por favor intenta de nuevo.</p>';
        }
    }
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
const productModal = document.getElementById('product-modal');
const modalSteps = document.querySelectorAll('.modal-step');
const stepIndicator = document.getElementById('step-indicator');
const modalBackBtn = document.getElementById('modal-back-btn');
const modalNextBtn = document.getElementById('modal-next-btn');
const closeModalBtn = document.getElementById('close-product-modal');
const deleteConfirmModal = document.getElementById('delete-confirm-modal');
const cartDetailModal = document.getElementById('cart-detail-modal');
let itemToDeleteIndex = null;
let editingCartIndex = null; // Índice del producto que se está editando

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
// DESCRIPTION TOOLTIP LOGIC
// ========================================
const tooltipOverlay = document.getElementById('desc-tooltip');
const tooltipTitle = document.getElementById('tooltip-title');
const tooltipDescription = document.getElementById('tooltip-description');
const closeTooltipBtn = document.getElementById('close-tooltip-btn');

function showDescriptionTooltip(typeId) {
    const priceType = allPriceTypes.find(t => t.id_tipo_precio == typeId);
    if (!priceType || !priceType.descripcion) return;

    tooltipTitle.textContent = priceType.nombre || 'Descripción';
    tooltipDescription.textContent = priceType.descripcion;
    tooltipOverlay.classList.add('open');
}

function closeDescriptionTooltip() {
    tooltipOverlay.classList.remove('open');
}

closeTooltipBtn.onclick = closeDescriptionTooltip;
tooltipOverlay.onclick = (e) => { if (e.target === tooltipOverlay) closeDescriptionTooltip(); };

// ========================================
// CUSTOM ALERT LOGIC
// ========================================
function showCustomAlert(message) {
    const alertOverlay = document.getElementById('custom-alert');
    const alertMsg = document.getElementById('custom-alert-msg');
    // Elementos a difuminar
    const elementsToBlur = [
        document.getElementById('main-header'),
        document.getElementById('main-content'),
        document.querySelector('.main-footer')
    ];

    alertMsg.textContent = message;
    alertOverlay.classList.add('active');
    // elementsToBlur.forEach(el => { if(el) el.classList.add('blur-active'); }); // Desactivamos el blur si es muy invasivo, o lo dejamos sutil

    setTimeout(() => {
        alertOverlay.classList.remove('active');
        // elementsToBlur.forEach(el => { if(el) el.classList.remove('blur-active'); });
    }, 2000);
}

// ========================================
// MULTI-STEP MODAL LOGIC
// ========================================
function renderVisualSteps(current, total) {
    const container = document.getElementById('visual-step-indicator');
    if (!container) return;
    container.innerHTML = '';

    for (let i = 1; i <= total; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'step-bubble';
        bubble.textContent = i;

        if (i < current) {
            bubble.classList.add('completed');
            // Allow clicking on completed steps to go back
            bubble.onclick = () => goToStep(i);
        } else if (i === current) {
            bubble.classList.add('active');
        }

        container.appendChild(bubble);

        if (i < total) {
            const connector = document.createElement('div');
            connector.className = 'step-connector';
            if (i < current) {
                connector.classList.add('completed');
            }
            container.appendChild(connector);
        }
    }
}

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

    // Update visual indicator
    renderVisualSteps(currentStep, totalSteps);

    // Update buttons
    modalBackBtn.style.display = currentStep > 1 ? 'block' : 'none';
    modalNextBtn.textContent = currentStep === 4 ? 'Confirmar y Agregar' : 'Siguiente';
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

function openProductModal(productId, itemToEdit = null) {
    // Reset state
    selectionData = {};
    selectedDatesSet.clear();
    calendarViewDate = new Date();
    editingCartIndex = itemToEdit ? cart.indexOf(itemToEdit) : null;
    
    // Reset map marker if exists
    if (mapInstance && mapMarker) {
        mapMarker.setLatLng([-17.3935, -66.1570]);
    }

    const product = allProducts.find(p => p.id_producto == productId);
    if (!product) return;

    // Si estamos editando, usamos los datos existentes, si no, iniciamos vacío
    selectionData = itemToEdit ? JSON.parse(JSON.stringify(itemToEdit)) : { product: product };
    
    // Restaurar fechas si estamos editando
    if (itemToEdit && itemToEdit.dates) {
        itemToEdit.dates.forEach(d => selectedDatesSet.add(d));
    }

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
            
            // Verificar si esta opción debe estar seleccionada (en modo edición)
            let isChecked = index === 0;
            if (itemToEdit) {
                // Comparamos precio y nombre de tipo para encontrar la opción correcta
                isChecked = (p.precio == itemToEdit.priceDetails.amount && typeName == itemToEdit.priceDetails.type);
            }

            const html = `
                <label>
                    <input type="radio" name="price_option" value="${index}" data-return="${requiresReturn}" data-min-days="${minDays}" class="price-option-input" ${isChecked ? 'checked' : ''} style="display:none;">
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
    
    // Si NO estamos editando, reseteamos fechas. Si editamos, mantenemos las cargadas arriba.
    if (!itemToEdit) {
        selectedDatesSet.clear();
        calendarViewDate = new Date();
    }
    
    // Show modal and go to first step
    productModal.classList.add('open');
    goToStep(1);
    toggleDates(); // Call after going to step 1 to ensure elements are visible
    
    // Init map if not already done
    setTimeout(() => {
        initMap();
        // Si estamos editando y hay ubicación, mover marcador
        if (itemToEdit && itemToEdit.location && mapMarker) {
            const loc = itemToEdit.location;
            mapMarker.setLatLng([loc.lat, loc.lng]);
            mapInstance.setView([loc.lat, loc.lng], 13);
            document.getElementById('location-status').textContent = `Ubicación: ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`;
        }
    }, 500);
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
        if (editingCartIndex !== null && editingCartIndex >= 0) {
            // Actualizar producto existente
            cart[editingCartIndex] = selectionData;
            showCustomAlert('Producto actualizado correctamente');
        } else {
            // Agregar nuevo producto
            cart.push(selectionData);
            showCustomAlert('Producto agregado correctamente');
        }
        
        updateCartUI();
        productModal.classList.remove('open');
        editingCartIndex = null; // Resetear índice de edición
    }
});

modalBackBtn.addEventListener('click', () => {
    if (currentStep > 1) {
        goToStep(currentStep - 1);
    }
});

function renderConfirmationStep() {
    const summaryContainer = document.getElementById('confirmation-summary');
    const { product, priceDetails, dates, location } = selectionData;

    let dateText = 'No aplica';
    let datesHtml = '';
    let totalCalculationHtml = '';

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

        // Cálculo de precio total estimado
        const unitPrice = parseFloat(priceDetails.amount);
        const daysCount = dates.length;
        
        // Si es alquiler (permite múltiples fechas) multiplicamos, si no (venta) asumimos precio único
        if (!isNaN(unitPrice)) {
            let total = unitPrice;
            let calcText = `Bs ${unitPrice}`;
            
            if (selectionData.allowMultipleDates && daysCount > 1) {
                total = unitPrice * daysCount;
                calcText = `Bs ${unitPrice} x ${daysCount} días = Bs ${total}`;
            }
            
            totalCalculationHtml = `<div class="summary-item" style="border:1px solid var(--gold);"><strong>Total Estimado:</strong><span>${calcText}</span></div>`;
        }
    }

    const locationText = location ? `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}` : 'No seleccionada';

    summaryContainer.innerHTML = `
        <div class="summary-item"><strong>Producto:</strong><span>${product.nombre}</span></div>
        <div class="summary-item"><strong>Opción:</strong><span>${priceDetails.type} - Bs ${priceDetails.amount}</span></div>
        <div class="summary-item"><strong>Fechas:</strong><span>${datesHtml || dateText}</span></div>
        <div class="summary-item"><strong>Ubicación:</strong><span>${locationText}</span></div>
        ${totalCalculationHtml}
    `;
}

// ========================================
// CART ITEM DETAILS & DELETE LOGIC
// ========================================

// Delete Confirmation
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

function requestRemoveFromCart(index) {
    itemToDeleteIndex = index;
    deleteConfirmModal.classList.add('open');
}

cancelDeleteBtn.addEventListener('click', () => {
    deleteConfirmModal.classList.remove('open');
    itemToDeleteIndex = null;
});

confirmDeleteBtn.addEventListener('click', () => {
    if (itemToDeleteIndex !== null) {
        cart.splice(itemToDeleteIndex, 1);
        updateCartUI();
        deleteConfirmModal.classList.remove('open');
        showCustomAlert("Producto eliminado");
    }
});

// View Details
const closeDetailModalBtn = document.getElementById('close-detail-modal');
closeDetailModalBtn.addEventListener('click', () => cartDetailModal.classList.remove('open'));

function viewCartItem(index) {
    const item = cart[index];
    if (!item) return;

    document.getElementById('detail-product-name').textContent = item.product.nombre;
    const container = document.getElementById('detail-content');
    
    // Reutilizamos la lógica de renderizado de resumen
    // Creamos un objeto temporal selectionData para usar la función existente o lo hacemos manual
    let dateText = 'No aplica';
    let datesHtml = '';
    let totalCalculationHtml = '';

    if (item.dates && item.dates.length > 0) {
         datesHtml = item.dates.join(', '); // Simplificado para vista rápida
         
         // Cálculo de precio total
         const unitPrice = parseFloat(item.priceDetails.amount);
         const daysCount = item.dates.length;
         
         if (!isNaN(unitPrice)) {
             let total = unitPrice;
             let calcText = `Bs ${unitPrice}`;
             
             if (item.allowMultipleDates && daysCount > 1) {
                 total = unitPrice * daysCount;
                 calcText = `Bs ${unitPrice} x ${daysCount} días = Bs ${total}`;
             }
             totalCalculationHtml = `<div class="summary-item" style="border:1px solid var(--gold);"><strong>Total Estimado:</strong><span>${calcText}</span></div>`;
         }
    }
    const locationText = item.location ? `Lat: ${item.location.lat.toFixed(4)}, Lng: ${item.location.lng.toFixed(4)}` : 'No seleccionada';

    container.innerHTML = `
        <div class="summary-item"><strong>Opción:</strong><span>${item.priceDetails.type}</span></div>
        <div class="summary-item"><strong>Precio:</strong><span>Bs ${item.priceDetails.amount}</span></div>
        <div class="summary-item"><strong>Fechas:</strong><span>${datesHtml || dateText}</span></div>
        <div class="summary-item"><strong>Ubicación:</strong><span>${locationText}</span></div>
        ${totalCalculationHtml}
    `;

    cartDetailModal.classList.add('open');
}

function editCartItem(index) {
    const item = cart[index];
    if (!item) return;
    // Abrir modal en modo edición
    openProductModal(item.product.id_producto, item);
    // Cerrar carrito para ver el modal
    toggleCart();
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
        div.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.product.nombre}</h4>
                <small style="color:var(--gold);">${item.priceDetails.type}</small>
                <div class="cart-item-actions">
                    <button class="btn-view-details" onclick="viewCartItem(${index})">Ver</button>
                    <button class="btn-view-details btn-edit-item" onclick="editCartItem(${index})">Editar</button>
                </div>
            </div>
            <button class="cart-item-remove" onclick="requestRemoveFromCart(${index})">&times;</button>
        `;
        cartItemsContainer.appendChild(div);
    });
}

/* 
   NOTA: He eliminado la función removeFromCart antigua y la he integrado 
   en la lógica de confirmación de arriba. Asegúrate de que no quede duplicada.
*/

/*
function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}
*/

checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) {
        showCustomAlert("Tu carrito está vacío");
        return;
    }

    // Usar el primer contacto de la configuración por defecto
    let selectedNumber = "";
    if (config.contacts && config.contacts.length > 0) {
        selectedNumber = config.contacts[0].number;
    } else {
        showCustomAlert("Error: No hay número de contacto configurado.");
        return; 
    }

    // Build WhatsApp Message
    let message = `Hola *Sonido Unicornio*, quisiera cotizar los siguientes equipos:\n\n`;
    let grandTotal = 0;
    
    cart.forEach(item => {
        const unitPrice = parseFloat(item.priceDetails.amount);
        let itemTotal = unitPrice;
        let priceStr = `Bs ${item.priceDetails.amount}`;

        if (!isNaN(unitPrice) && item.allowMultipleDates && item.dates && item.dates.length > 1) {
            itemTotal = unitPrice * item.dates.length;
            priceStr = `Bs ${unitPrice} x ${item.dates.length} días = Bs ${itemTotal}`;
        }
        
        if (!isNaN(itemTotal)) grandTotal += itemTotal;

        message += `🔹 *${item.product.nombre}*\n`;
        message += `   - Opción: ${item.priceDetails.type} (${priceStr})\n`;
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

    if (grandTotal > 0) {
        message += `💰 *Total Estimado: Bs ${grandTotal}*\n`;
    }

    message += `\nQuedo atento a su respuesta.`;

    const url = `https://wa.me/${selectedNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
});

// Function to enter "App Mode" (Hide welcome, show content)
function enterAppMode() {
    welcomeScreen.classList.add('fade-out');
    mainHeader.classList.remove('header-hidden');
    mainContent.classList.remove('content-hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Main function to initialize the app
async function initializeApp() {
    productsGrid.innerHTML = getSkeletonHTML(3); // Skeleton inicial

    // Fetch metadata only (Sections, Categories, Price Types)
    const [sections, categories, priceTypes] = await Promise.all([
        fetchSheetData('secciones', '0'),
        fetchSheetData('categorias', '234567890'), 
        fetchSheetData('tipo_precios', 'GID_TIPOS_PRECIO')
    ]);

    allSections = sections;
    allCategories = categories;
    allPriceTypes = priceTypes;

    // Set contact button link
    const contactBtn = document.getElementById('contact-footer-btn');
    if (contactBtn && config.contacts && config.contacts.length > 0) {
        contactBtn.href = `https://wa.me/${config.contacts[0].number}`;
    }

    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();

    // Render section navigation (Both Hero and Sticky)
    sectionNav.innerHTML = '';
    heroNav.innerHTML = '';
    const activeSections = allSections.filter(s => isActive(s.activo));

    activeSections.forEach(item => {
      // 1. Botones para la barra pegajosa (Sticky Nav)
      const btn = document.createElement('button');
      btn.className = 'section-btn';
      btn.textContent = item.nombre;
      btn.dataset.section = item.seccion;

      btn.addEventListener('click', () => {
          const sectionId = item.seccion;
          history.pushState({ section: sectionId }, '', `#${sectionId}`);
          renderContent(sectionId);
      });
      sectionNav.appendChild(btn);

      // 2. Botones grandes para la bienvenida (Hero)
      const heroBtn = document.createElement('button');
      heroBtn.className = 'hero-btn-large';
      heroBtn.textContent = item.nombre;
      
      heroBtn.addEventListener('click', () => {
          // Activar pantalla completa al iniciar
          if (!document.fullscreenElement) {
              if (document.documentElement.requestFullscreen) {
                  document.documentElement.requestFullscreen().catch(err => console.log(err));
              } else if (document.documentElement.webkitRequestFullscreen) { /* Safari */
                  document.documentElement.webkitRequestFullscreen();
              }
          }

          const sectionId = item.seccion;
          history.pushState({ section: sectionId }, '', `#${sectionId}`);
          renderContent(sectionId);
          enterAppMode(); // Transición visual
      });
      heroNav.appendChild(heroBtn);
    });

    // Determine initial section to render
    const initialSectionId = window.location.hash.substring(1);
    if (initialSectionId && activeSections.some(s => s.seccion === initialSectionId)) {
        // Si hay hash, saltamos la bienvenida directamente
        enterAppMode();
        renderContent(initialSectionId);
    } else {
        // Si no hay hash, nos quedamos en la bienvenida.
        // Opcional: Cargar contenido por defecto en segundo plano
        if (activeSections.length > 0) renderContent(activeSections[0].seccion);
    }
}

// ========================================
// SCROLL SPY (Auto-detect Category)
// ========================================
window.addEventListener('scroll', () => {
    const titles = document.querySelectorAll('.category-title');
    const navBtns = document.querySelectorAll('.category-btn');
    
    if (titles.length === 0) return;

    let currentId = '';
    // Ajuste del punto de detección
    const offset = window.innerWidth < 1024 ? 250 : 150;

    titles.forEach(title => {
        const rect = title.getBoundingClientRect();
        if (rect.top < offset) {
            currentId = title.id.replace('cat-', '');
        }
    });

    if (currentId) {
        navBtns.forEach(btn => {
            if (btn.dataset.id == currentId) {
                btn.classList.add('active');
                // Eliminado scrollIntoView automático para evitar bloqueo de clics
            } else {
                btn.classList.remove('active');
            }
        });
    }
});

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