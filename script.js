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
const manageUsersButton = document.getElementById('manage-users-button');
const userModal = document.getElementById('user-modal');
const userForm = document.getElementById('user-form');
const cancelUserButton = document.getElementById('cancel-user-button');

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
        if (product.listino) {
            product.listino.forEach(item => {
                const prezzo = typeof item.prezzo_netto === 'number' ? item.prezzo_netto.toFixed(2) : 'N/A';
                listinoHtml += `<tr><td>${item.id_item || ''}</td><td>${item.dimensione || ''}</td><td>€ ${prezzo}</td></tr>`;
            });
        }
        listinoHtml += '</tbody></table>';

        const actionButtonsHTML = currentUserIsAdmin ? `
            <div class="product-actions admin-only">
                <button class="action-button edit" data-id="${product.id}"><i class="fas fa-pencil-alt"></i></button>
                <button class="action-button delete" data-id="${product.id}"><i class="fas fa-trash"></i></button>
            </div>` : '';

        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            ${actionButtonsHTML}
            <h2>${product.nome_generico}</h2>
            <p><strong>Produttore:</strong> ${product.produttore}</p>
            <p><strong>Fornitore:</strong> ${product.fornitore_nome} (<a href="mailto:${product.fornitore_email}">${product.fornitore_email}</a>)</p>
            <h3>Listino:</h3>
            ${listinoHtml}`;
        resultsContainer.appendChild(productCard);
    });

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
    if (product) {
        modalTitle.textContent = 'Modifica Prodotto';
        productIdInput.value = product.id;
        document.getElementById('nome_generico').value = product.nome_generico;
        document.getElementById('produttore').value = product.produttore;
        document.getElementById('fornitore_nome').value = product.fornitore_nome;
        document.getElementById('fornitore_email').value = product.fornitore_email;
        document.getElementById('keywords').value = product.keywords ? product.keywords.split(' ').join(', ') : '';
        if (product.listino && product.listino.length > 0) {
            product.listino.forEach(item => addListinoRow(item));
        } else {
            addListinoRow();
        }
    } else {
        modalTitle.textContent = 'Aggiungi Nuovo Prodotto';
        productIdInput.value = '';
        addListinoRow();
    }
    productModal.classList.remove('hidden');
}

function closeModal() {
    productModal.classList.add('hidden');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = productIdInput.value;
    const listinoRows = listinoTableBody.querySelectorAll('tr');
    const listinoJSON = Array.from(listinoRows).map(row => {
        return { id_item: row.querySelector('.listino-id-item').value, dimensione: row.querySelector('.listino-dimensione').value, prezzo_netto: parseFloat(row.querySelector('.listino-prezzo').value) || 0 };
    }).filter(item => item.id_item || item.dimensione);
    const keywordsInput = document.getElementById('keywords').value;
    const keywordsForDB = keywordsInput.split(',').map(k => k.trim()).filter(k => k).join(' ');
    const productData = { nome_generico: document.getElementById('nome_generico').value, produttore: document.getElementById('produttore').value, fornitore_nome: document.getElementById('fornitore_nome').value, fornitore_email: document.getElementById('fornitore_email').value, keywords: keywordsForDB, listino: listinoJSON };
    let error;
    if (id) {
        const { error: updateError } = await supabaseClient.from('prodotti').update(productData).eq('id', id);
        error = updateError;
    } else {
        const { error: insertError } = await supabaseClient.from('prodotti').insert([productData]);
        error = insertError;
    }
    if (error) {
        alert(`Errore: ${error.message}`);
    } else {
        closeModal();
        performSearch();
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

function openUserModal() {
    userForm.reset();
    userModal.classList.remove('hidden');
}

function closeUserModal() {
    userModal.classList.add('hidden');
}

async function handleUserFormSubmit(e) {
    e.preventDefault();
    const newUserEmail = document.getElementById('new-user-email').value;
    const newUserPassword = document.getElementById('new-user-password').value;
    const PIPEDREAM_WEBHOOK_URL = 'https://xxxxxxxx.m.pipedream.net'; // SOSTITUISCI CON IL TUO URL PIPEDREAM

    if (PIPEDREAM_WEBHOOK_URL.includes('xxxxxxxx')) {
        alert('Configura l\'URL del webhook di Pipedream in script.js per creare utenti.');
        return;
    }
    
    try {
        const response = await fetch(PIPEDREAM_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: newUserEmail, password: newUserPassword }),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.msg || 'Errore sconosciuto dal server.');
        }
        alert(`Utente ${result.user.email} creato con successo!`);
        closeUserModal();
    } catch (error) {
        alert(`Errore nella creazione dell'utente: ${error.message}`);
    }
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
manageUsersButton.addEventListener('click', openUserModal);
cancelUserButton.addEventListener('click', closeUserModal);
userForm.addEventListener('submit', handleUserFormSubmit);
