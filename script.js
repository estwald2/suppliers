// --- CONFIGURAZIONE ---
const SUPABASE_URL = 'https://akgfyvmnlqzwjqvctxhw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrZ2Z5dm1ubHF6d2pxdmN0eGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MDI3NjAsImV4cCI6MjA2ODA3ODc2MH0.WJoBXPp_ApIfTMr0zzdMlCKnmDZSSBD5RxJ7w8pFzgs';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginSection = document.getElementById('login-section');
const searchSection = document.getElementById('search-section');
const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const logoutButton = document.getElementById('logout-button');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const resultsContainer = document.getElementById('results-container');
const loadingSpinner = document.getElementById('loading-spinner');
const addProductButton = document.getElementById('add-product-button');
const productModal = document.getElementById('product-modal');
const modalTitle = document.getElementById('modal-title');
const productForm = document.getElementById('product-form');
const cancelButton = document.getElementById('cancel-button');
const productIdInput = document.getElementById('product-id');
const listinoTableBody = document.querySelector('#listino-table-editor tbody');
const addListinoRowButton = document.getElementById('add-listino-row');
const adminLabel = document.getElementById('admin-label');
const recommendedContainer = document.getElementById('recommended-products-container');
const recommendedDiv = document.getElementById('recommended-products');
const alternativeContainer = document.getElementById('alternative-products-container');
const alternativeDiv = document.getElementById('alternative-products');
const productTypeRadios = document.querySelectorAll('input[name="product_type"]');
const livelloConsigliatoWrapper = document.getElementById('livello-consigliato-wrapper');

let debounceTimer;
let currentUserIsAdmin = false;

async function checkAdminStatus() {
    const { data, error } = await supabaseClient.rpc('is_admin');
    if (error) {
        console.error("Errore nel verificare lo stato di admin:", error);
        return false;
    }
    return data;
}

async function updateUI(user) {
    if (user) {
        loginSection.classList.add('hidden');
        searchSection.classList.remove('hidden');
        currentUserIsAdmin = await checkAdminStatus();
        document.querySelectorAll('.admin-only').forEach(elem => {
            elem.style.display = currentUserIsAdmin ? '' : 'none';
        });
    } else {
        loginSection.classList.remove('hidden');
        searchSection.classList.add('hidden');
        currentUserIsAdmin = false;
        document.querySelectorAll('.admin-only').forEach(elem => {
            elem.style.display = 'none';
        });
    }
}

supabaseClient.auth.onAuthStateChange((event, session) => {
    updateUI(session?.user);
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: loginEmail.value,
        password: loginPassword.value,
    });
    if (error) {
        loginError.textContent = `Errore: ${error.message}`;
        loginError.classList.remove('hidden');
    }
});

logoutButton.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
});

async function performSearch() {
    const searchTerm = searchInput.value.trim();
    if (searchTerm.length === 0) {
        resultsContainer.innerHTML = '';
        recommendedContainer.classList.add('hidden');
        alternativeContainer.classList.add('hidden');
        loadingSpinner.classList.add('hidden');
        return;
    }
    loadingSpinner.classList.remove('hidden');
    try {
        const { data, error } = await supabaseClient.from('prodotti').select('*').ilike('keywords', `%${searchTerm}%`);
        if (error) throw error;
        displayResults(data);
    } catch (error) {
        resultsContainer.innerHTML = `<p style="color: red;">Errore: ${error.message}</p>`;
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

function displayResults(products) {
    recommendedDiv.innerHTML = '';
    alternativeDiv.innerHTML = '';

    const recommendedProducts = products.filter(p => p.consigliato);
    const alternativeProducts = products.filter(p => !p.consigliato);

    recommendedContainer.classList.toggle('hidden', recommendedProducts.length === 0);
    alternativeContainer.classList.toggle('hidden', alternativeProducts.length === 0);

    const noResultsMsg = document.querySelector('#results-container > p');
    if (noResultsMsg) noResultsMsg.remove();
    if (products.length === 0) {
        resultsContainer.innerHTML = '<p>Nessun prodotto trovato.</p>';
        return;
    }

    const processProduct = (product, container) => {
        let listinoHtml = `<table class="listino-table"><thead><tr><th>ID Item</th><th>Dimensione</th><th>Prezzo Netto</th></tr></thead><tbody>`;
        if (product.listino) {
            product.listino.forEach(item => {
                const prezzo = typeof item.prezzo_netto === 'number' ? item.prezzo_netto.toFixed(2) : 'N/A';
                listinoHtml += `<tr><td>${item.id_item || ''}</td><td>${item.dimensione || ''}</td><td>€ ${prezzo}</td></tr>`;
            });
        }
        listinoHtml += '</tbody></table>';

        const actionButtonsHTML = currentUserIsAdmin ? `<div class="product-actions"><button class="action-button edit" data-id="${product.id}"><i class="fas fa-pencil-alt"></i></button><button class="action-button delete" data-id="${product.id}"><i class="fas fa-trash"></i></button></div>` : '';
        const imageHTML = product.immagine_url ? `<img src="${product.immagine_url}" alt="${product.nome_generico}" class="product-image">` : '';
        const datasheetHTML = product.scheda_tecnica_url ? `<a href="${product.scheda_tecnica_url}?download=" download="${product.nome_generico}_scheda.pdf" class="datasheet-link"><i class="fas fa-file-pdf"></i> Scarica Scheda Tecnica</a>` : '';
        const badgeHTML = product.consigliato && product.tipo_consigliato ? `<span class="product-badge ${product.tipo_consigliato}">${product.tipo_consigliato.charAt(0).toUpperCase() + product.tipo_consigliato.slice(1)}</span>` : '';

        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            ${badgeHTML}
            ${actionButtonsHTML}
            ${imageHTML}
            <div class="product-details">
                <h2>${product.nome_generico}</h2>
                <p><strong>Produttore:</strong> ${product.produttore}</p>
                <p><strong>Fornitore:</strong> ${product.fornitore_nome} (<a href="mailto:${product.fornitore_email}">${product.fornitore_email}</a>)</p>
                ${datasheetHTML}
            </div>
            <div style="clear: both;"></div>
            <h3>Listino:</h3>
            ${listinoHtml}`;
        container.appendChild(productCard);
    };

    recommendedProducts.forEach(product => processProduct(product, recommendedDiv));
    alternativeProducts.forEach(product => processProduct(product, alternativeDiv));

    if (currentUserIsAdmin) {
        document.querySelectorAll('.action-button.edit').forEach(button => button.addEventListener('click', handleEditClick));
        document.querySelectorAll('.action-button.delete').forEach(button => button.addEventListener('click', handleDeleteClick));
    }
}

function addListinoRow(item = { id_item: '', dimensione: '', prezzo_netto: '' }) {
    const row = document.createElement('tr');
    row.innerHTML = `<td><input type="text" class="listino-id-item" value="${item.id_item || ''}" required></td><td><input type="text" class="listino-dimensione" value="${item.dimensione || ''}" required></td><td><input type="number" step="0.01" class="listino-prezzo" value="${item.prezzo_netto || ''}" required></td><td><button type="button" class="delete-row-btn"><i class="fas fa-trash"></i></button></td>`;
    listinoTableBody.appendChild(row);
    row.querySelector('.delete-row-btn').addEventListener('click', () => row.remove());
}

function openModal(product = null) {
    productForm.reset();
    listinoTableBody.innerHTML = '';
    document.getElementById('immagine-preview').textContent = '';
    document.getElementById('scheda-tecnica-preview').textContent = '';

    if (product) {
        modalTitle.textContent = 'Modifica Prodotto';
        productIdInput.value = product.id;
        document.getElementById('nome_generico').value = product.nome_generico;
        document.getElementById('produttore').value = product.produttore;
        document.getElementById('fornitore_nome').value = product.fornitore_nome;
        document.getElementById('fornitore_email').value = product.fornitore_email;
        document.getElementById('keywords').value = product.keywords ? product.keywords.split(' ').join(', ') : '';
        
        if (product.consigliato) {
            document.getElementById('tipo-consigliato').checked = true;
            livelloConsigliatoWrapper.style.display = 'block';
            document.getElementById('livello-consigliato').value = product.tipo_consigliato || 'premium';
        } else {
            document.getElementById('tipo-alternativa').checked = true;
            livelloConsigliatoWrapper.style.display = 'none';
        }
        
        if (product.immagine_url) {
            document.getElementById('immagine-preview').textContent = `File attuale: ${product.immagine_url.split('/').pop()}`;
        }
        if (product.scheda_tecnica_url) {
            document.getElementById('scheda-tecnica-preview').textContent = `File attuale: ${product.scheda_tecnica_url.split('/').pop()}`;
        }

        if (product.listino && product.listino.length > 0) {
            product.listino.forEach(item => addListinoRow(item));
        } else {
            addListinoRow();
        }
    } else {
        modalTitle.textContent = 'Aggiungi Nuovo Prodotto';
        productIdInput.value = '';
        document.getElementById('tipo-consigliato').checked = true;
        livelloConsigliatoWrapper.style.display = 'block';
        document.getElementById('livello-consigliato').value = 'premium';
        addListinoRow();
    }
    productModal.classList.remove('hidden');
}

function closeModal() {
    productModal.classList.add('hidden');
}

async function uploadFile(file, bucket, oldUrl = null) {
    if (!file) return oldUrl;
    const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
    const { error } = await supabaseClient.storage.from(bucket).upload(fileName, file);
    if (error) {
        console.error(`Errore nell'upload del file nel bucket ${bucket}:`, error);
        throw error;
    }
    const { data } = supabaseClient.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = productIdInput.value;
    const saveButton = e.target.querySelector('.button-save');
    saveButton.disabled = true;
    saveButton.textContent = 'Salvataggio...';

    try {
        const immagineFile = document.getElementById('immagine-upload').files[0];
        const schedaFile = document.getElementById('scheda-tecnica-upload').files[0];
        
        let oldProductData = {};
        if (id) {
            const { data } = await supabaseClient.from('prodotti').select('immagine_url, scheda_tecnica_url').eq('id', id).single();
            oldProductData = data || {};
        }

        const immagine_url = await uploadFile(immagineFile, 'immagini-prodotti', oldProductData.immagine_url);
        const scheda_tecnica_url = await uploadFile(schedeFile, 'schede-tecniche', oldProductData.scheda_tecnica_url);

        const listinoRows = listinoTableBody.querySelectorAll('tr');
        const listinoJSON = Array.from(listinoRows).map(row => {
            return { id_item: row.querySelector('.listino-id-item').value, dimensione: row.querySelector('.listino-dimensione').value, prezzo_netto: parseFloat(row.querySelector('.listino-prezzo').value) || 0 };
        }).filter(item => item.id_item || item.dimensione);
        
        const keywordsInput = document.getElementById('keywords').value;
        const keywordsForDB = keywordsInput.split(',').map(k => k.trim()).filter(k => k).join(' ');
        
        const isConsigliato = document.getElementById('tipo-consigliato').checked;
        const tipoConsigliatoValue = isConsigliato ? document.getElementById('livello-consigliato').value : null;

        const productData = {
            nome_generico: document.getElementById('nome_generico').value,
            produttore: document.getElementById('produttore').value,
            fornitore_nome: document.getElementById('fornitore_nome').value,
            fornitore_email: document.getElementById('fornitore_email').value,
            keywords: keywordsForDB,
            listino: listinoJSON,
            immagine_url: immagine_url,
            scheda_tecnica_url: scheda_tecnica_url,
            consigliato: isConsigliato,
            tipo_consigliato: tipoConsigliatoValue,
        };

        let error;
        if (id) {
            const { error: updateError } = await supabaseClient.from('prodotti').update(productData).eq('id', id);
            error = updateError;
        } else {
            const { error: insertError } = await supabaseClient.from('prodotti').insert([productData]);
            error = insertError;
        }

        if (error) throw error;

        closeModal();
        performSearch();

    } catch (error) {
        alert(`Errore durante il salvataggio: ${error.message}`);
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Salva';
    }
}

async function fetchProductAndOpenModal(id) {
    const { data, error } = await supabaseClient.from('prodotti').select('*').eq('id', id).single();
    if (error) {
        alert(`Errore nel recupero del prodotto: ${error.message}`);
    } else {
        openModal(data);
    }
}

async function handleDeleteClick(e) {
    const id = e.currentTarget.dataset.id;
    if (confirm('Sei sicuro di voler eliminare questo prodotto?')) {
        const { data: product } = await supabaseClient.from('prodotti').select('immagine_url, scheda_tecnica_url').eq('id', id).single();
        if (product) {
            if (product.immagine_url) {
                const fileName = product.immagine_url.split('/').pop();
                await supabaseClient.storage.from('immagini-prodotti').remove([fileName]);
            }
            if (product.scheda_tecnica_url) {
                const fileName = product.scheda_tecnica_url.split('/').pop();
                await supabaseClient.storage.from('schede-tecniche').remove([fileName]);
            }
        }
        
        const { error } = await supabaseClient.from('prodotti').delete().eq('id', id);
        if (error) {
            alert(`Errore durante l'eliminazione: ${error.message}`);
        } else {
            performSearch();
        }
    }
}

function handleEditClick(e) {
    fetchProductAndOpenModal(e.currentTarget.dataset.id);
}

searchButton.addEventListener('click', performSearch);
searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(performSearch, 400);
});
addProductButton.addEventListener('click', () => openModal());
cancelButton.addEventListener('click', closeModal);
productForm.addEventListener('submit', handleFormSubmit);
addListinoRowButton.addEventListener('click', () => addListinoRow());
productTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        livelloConsigliatoWrapper.style.display = e.target.value === 'consigliato' ? 'block' : 'none';
    });
});
