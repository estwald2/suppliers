// --- CONFIGURAZIONE ---
const SUPABASE_URL = 'https://akgfyvmnlqzwjqvctxhw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrZ2Z5dm1ubHF6d2pxdmN0eGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MDI3NjAsImV4cCI6MjA2ODA3ODc2MH0.WJoBXPp_ApIfTMr0zzdMlCKnmDZSSBD5RxJ7w8pFzgs';

// --- INIZIALIZZAZIONE ---
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- ELEMENTI DEL DOM ---
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

// --- NUOVI ELEMENTI DEL DOM PER CRUD ---
const addProductButton = document.getElementById('add-product-button');
const productModal = document.getElementById('product-modal');
const modalTitle = document.getElementById('modal-title');
const productForm = document.getElementById('product-form');
const cancelButton = document.getElementById('cancel-button');
const productIdInput = document.getElementById('product-id');

let debounceTimer;

// --- GESTIONE AUTENTICAZIONE (invariata) ---
function updateUI(user) {
    if (user) {
        loginSection.classList.add('hidden');
        searchSection.classList.remove('hidden');
    } else {
        loginSection.classList.remove('hidden');
        searchSection.classList.add('hidden');
    }
}

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

supabaseClient.auth.onAuthStateChange((event, session) => {
    updateUI(session?.user);
});

// --- FUNZIONI DI RICERCA ---
async function performSearch() {
    const searchTerm = searchInput.value.trim();
    if (searchTerm.length < 2) {
        resultsContainer.innerHTML = '';
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
    resultsContainer.innerHTML = '';
    if (!products || products.length === 0) {
        resultsContainer.innerHTML = '<p>Nessun prodotto trovato.</p>';
        return;
    }
    
    products.forEach(product => {
        let listinoHtml = `<table class="listino-table"><thead><tr><th>ID Item</th><th>Dimensione</th><th>Prezzo Netto</th></tr></thead><tbody>`;
        product.listino.forEach(item => {
            listinoHtml += `<tr><td>${item.id_item}</td><td>${item.dimensione}</td><td>€ ${item.prezzo_netto.toFixed(2)}</td></tr>`;
        });
        listinoHtml += '</tbody></table>';

        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        // Aggiunti i bottoni di azione
        productCard.innerHTML = `
            <div class="product-actions">
                <button class="action-button edit" data-id="${product.id}"><i class="fas fa-pencil-alt"></i></button>
                <button class="action-button delete" data-id="${product.id}"><i class="fas fa-trash"></i></button>
            </div>
            <h2>${product.nome_generico}</h2>
            <p><strong>Produttore:</strong> ${product.produttore}</p>
            <p><strong>Fornitore:</strong> ${product.fornitore_nome} (<a href="mailto:${product.fornitore_email}">${product.fornitore_email}</a>)</p>
            <h3>Listino:</h3>
            ${listinoHtml}
        `;
        resultsContainer.appendChild(productCard);
    });

    // Aggiungi event listener ai nuovi bottoni
    document.querySelectorAll('.action-button.edit').forEach(button => button.addEventListener('click', handleEditClick));
    document.querySelectorAll('.action-button.delete').forEach(button => button.addEventListener('click', handleDeleteClick));
}

// --- NUOVA LOGICA CRUD ---

function openModal(product = null) {
    productForm.reset();
    if (product) {
        // Modal per MODIFICARE
        modalTitle.textContent = 'Modifica Prodotto';
        productIdInput.value = product.id;
        document.getElementById('nome_generico').value = product.nome_generico;
        document.getElementById('produttore').value = product.produttore;
        document.getElementById('fornitore_nome').value = product.fornitore_nome;
        document.getElementById('fornitore_email').value = product.fornitore_email;
        document.getElementById('keywords').value = product.keywords;
        // JSON.stringify per formattare il JSON in modo leggibile nella textarea
        document.getElementById('listino').value = JSON.stringify(product.listino, null, 2);
    } else {
        // Modal per AGGIUNGERE
        modalTitle.textContent = 'Aggiungi Nuovo Prodotto';
        productIdInput.value = '';
    }
    productModal.classList.remove('hidden');
}

function closeModal() {
    productModal.classList.add('hidden');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = productIdInput.value;

    let listinoParsed;
    try {
        listinoParsed = JSON.parse(document.getElementById('listino').value);
    } catch (error) {
        alert('Errore nel formato JSON del listino. Correggi prima di salvare.');
        return;
    }

    const productData = {
        nome_generico: document.getElementById('nome_generico').value,
        produttore: document.getElementById('produttore').value,
        fornitore_nome: document.getElementById('fornitore_nome').value,
        fornitore_email: document.getElementById('fornitore_email').value,
        keywords: document.getElementById('keywords').value,
        listino: listinoParsed,
    };

    let error;
    if (id) {
        // UPDATE
        const { error: updateError } = await supabaseClient.from('prodotti').update(productData).eq('id', id);
        error = updateError;
    } else {
        // INSERT
        const { error: insertError } = await supabaseClient.from('prodotti').insert([productData]);
        error = insertError;
    }

    if (error) {
        alert(`Errore: ${error.message}`);
    } else {
        closeModal();
        performSearch(); // Ricarica i risultati per vedere le modifiche
    }
}

function handleEditClick(e) {
    const id = e.currentTarget.dataset.id;
    // Troviamo il prodotto nei dati già caricati per non fare una nuova chiamata
    const product = Array.from(resultsContainer.querySelectorAll('.product-card')).find(card => card.querySelector('.edit').dataset.id === id);
    // Questo è un trucco, sarebbe meglio fare una nuova chiamata per avere i dati più aggiornati. Scegliamo la via semplice per ora.
    // Dobbiamo recuperare i dati completi. Facciamo una nuova chiamata a Supabase
    fetchProductAndOpenModal(id);
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
    if (confirm('Sei sicuro di voler eliminare questo prodotto? L\'azione è irreversibile.')) {
        const { error } = await supabaseClient.from('prodotti').delete().eq('id', id);
        if (error) {
            alert(`Errore durante l'eliminazione: ${error.message}`);
        } else {
            performSearch(); // Ricarica i risultati
        }
    }
}

// --- EVENT LISTENERS ---
searchButton.addEventListener('click', performSearch);
searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(performSearch, 400);
});

// Nuovi listener per CRUD
addProductButton.addEventListener('click', () => openModal());
cancelButton.addEventListener('click', closeModal);
productForm.addEventListener('submit', handleFormSubmit);
