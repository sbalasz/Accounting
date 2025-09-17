// Business Expense Tracker Application
class ExpenseTracker {
    constructor() {
        console.log('ExpenseTracker constructor called');
        this.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        this.receipts = JSON.parse(localStorage.getItem('receipts')) || [];
        this.currentTab = 'dashboard';
        this.currentTransactionType = 'expense';
        this.chart = null;
        this.filteredTransactions = [];
        this.activeFilters = { type: '', category: '', search: '' };
        this.db = null;
        this.eventListenersSetup = false;
        this.selectionMode = {
            recent: false,
            all: false
        };
        this.selectedTransactions = {
            recent: new Set(),
            all: new Set()
        };
        
        this.initDatabase().then(() => {
            console.log('Database initialized, starting app init...');
        this.init();
        }).catch((error) => {
            console.error('Database init failed, continuing with basic init:', error);
            this.init();
        });
    }

    async initDatabase() {
        return new Promise((resolve, reject) => {
            console.log('Initializing IndexedDB for image storage...');
            
            const request = indexedDB.open('ExpenseTrackerDB', 1);
            
            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                this.showToast('Warning: Advanced image storage not available. Using basic storage.', 'error');
                resolve(); // Continue without IndexedDB
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object store for images
                if (!db.objectStoreNames.contains('images')) {
                    const imageStore = db.createObjectStore('images', { keyPath: 'id' });
                    console.log('Created images object store');
                }
                
                // Create object store for metadata
                if (!db.objectStoreNames.contains('metadata')) {
                    const metadataStore = db.createObjectStore('metadata', { keyPath: 'key' });
                    console.log('Created metadata object store');
                }
            };
        });
    }

    init() {
        this.setupEventListeners();
        this.updateCategoryOptions();
        this.updateDashboard();
        this.renderTransactions();
        this.renderReceipts();
        this.setDefaultDates();
        this.initializeChart();
        this.checkStorageStatus();
    }

    setupEventListeners() {
        if (this.eventListenersSetup) {
            console.log('Event listeners already set up, skipping...');
            return;
        }
        
        console.log('Setting up event listeners...');
        this.eventListenersSetup = true;
        
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.closest('.nav-btn').dataset.tab);
            });
        });

        // Transaction type toggle
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTransactionType(e.target.closest('.type-btn').dataset.type);
            });
        });

        // Transaction form
        document.getElementById('transaction-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });

        // Receipt upload
        document.getElementById('receipt-input').addEventListener('change', (e) => {
            console.log('Receipt input change event triggered');
            this.handleReceiptUpload(e);
        });

        document.getElementById('save-receipt').addEventListener('click', () => {
            this.saveReceipt();
        });

        document.getElementById('cancel-receipt').addEventListener('click', () => {
            this.cancelReceipt();
        });

        // Export functions
        document.getElementById('export-csv').addEventListener('click', () => {
            this.exportToCSV();
        });

        document.getElementById('export-summary').addEventListener('click', () => {
            this.generateSummaryReport();
        });

        document.getElementById('share-receipts').addEventListener('click', () => {
            this.shareReceipts();
        });

        // Upload area click (now handled by the file input overlay)
        // The file input now covers the entire upload area

        // New functionality event listeners
        this.setupNewEventListeners();
    }

    setupNewEventListeners() {
        // Search functionality
        document.getElementById('search-transactions').addEventListener('click', () => {
            this.openModal('search-modal');
        });

        document.getElementById('close-search-modal').addEventListener('click', () => {
            this.closeModal('search-modal');
        });

        document.getElementById('search-input').addEventListener('input', (e) => {
            this.performSearch(e.target.value);
        });

        // All Transactions tab functionality
        document.getElementById('filter-all-transactions').addEventListener('click', () => {
            this.toggleAllFilterBar();
        });

        document.getElementById('all-filter-type').addEventListener('change', (e) => {
            this.activeFilters.type = e.target.value;
            this.applyAllFilters();
        });

        document.getElementById('all-filter-category').addEventListener('change', (e) => {
            this.activeFilters.category = e.target.value;
            this.applyAllFilters();
        });

        document.getElementById('all-filter-search').addEventListener('input', (e) => {
            this.activeFilters.search = e.target.value;
            this.applyAllFilters();
        });

        document.getElementById('clear-all-filters').addEventListener('click', () => {
            this.clearAllFilters();
        });

        // Backup functionality
        document.getElementById('backup-all-data').addEventListener('click', () => {
            this.openModal('backup-modal');
        });

        document.getElementById('close-backup-modal').addEventListener('click', () => {
            this.closeModal('backup-modal');
        });

        document.getElementById('download-backup').addEventListener('click', () => {
            this.downloadBackup();
        });

        document.getElementById('upload-backup').addEventListener('click', () => {
            document.getElementById('restore-input').click();
        });

        document.getElementById('restore-input').addEventListener('change', (e) => {
            this.restoreBackup(e);
        });

        // Share functionality
        document.getElementById('share-dashboard').addEventListener('click', () => {
            this.openModal('share-modal');
        });

        document.getElementById('close-share-modal').addEventListener('click', () => {
            this.closeModal('share-modal');
        });

        document.getElementById('share-summary').addEventListener('click', () => {
            this.shareSummary();
        });

        document.getElementById('share-transactions').addEventListener('click', () => {
            this.shareTransactionsList();
        });

        document.getElementById('share-receipts').addEventListener('click', () => {
            this.shareReceipts();
            this.closeModal('share-modal');
        });

        document.getElementById('share-url').addEventListener('click', () => {
            this.shareAppURL();
        });

        // Transaction details modal
        document.getElementById('close-transaction-details').addEventListener('click', () => {
            this.closeModal('transaction-details-modal');
        });

        // Modal backdrop clicks
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Bulk selection for recent transactions
        const toggleRecentBtn = document.getElementById('toggle-recent-selection');
        if (toggleRecentBtn) {
            toggleRecentBtn.addEventListener('click', () => {
                console.log('Toggle recent selection clicked');
                this.toggleSelectionMode('recent');
            });
        } else {
            console.error('toggle-recent-selection button not found');
        }

        const selectAllRecentBtn = document.getElementById('select-all-recent');
        if (selectAllRecentBtn) {
            selectAllRecentBtn.addEventListener('click', () => {
                console.log('Select all recent clicked');
                this.selectAllTransactions('recent');
            });
        } else {
            console.error('select-all-recent button not found');
        }

        const clearSelectionRecentBtn = document.getElementById('clear-selection-recent');
        if (clearSelectionRecentBtn) {
            clearSelectionRecentBtn.addEventListener('click', () => {
                console.log('Clear selection recent clicked');
                this.clearSelection('recent');
            });
        } else {
            console.error('clear-selection-recent button not found');
        }

        const bulkEditRecentBtn = document.getElementById('bulk-edit-recent');
        if (bulkEditRecentBtn) {
            bulkEditRecentBtn.addEventListener('click', () => {
                console.log('Bulk edit recent clicked');
                this.openBulkEditModal('recent');
            });
        } else {
            console.error('bulk-edit-recent button not found');
        }

        const bulkDeleteRecentBtn = document.getElementById('bulk-delete-recent');
        if (bulkDeleteRecentBtn) {
            bulkDeleteRecentBtn.addEventListener('click', () => {
                console.log('Bulk delete recent clicked');
                this.bulkDeleteTransactions('recent');
            });
        } else {
            console.error('bulk-delete-recent button not found');
        }

        // Bulk selection for all transactions
        const toggleAllBtn = document.getElementById('toggle-all-selection');
        if (toggleAllBtn) {
            toggleAllBtn.addEventListener('click', () => {
                console.log('Toggle all selection clicked');
                this.toggleSelectionMode('all');
            });
        } else {
            console.error('toggle-all-selection button not found');
        }

        const selectAllAllBtn = document.getElementById('select-all-all');
        if (selectAllAllBtn) {
            selectAllAllBtn.addEventListener('click', () => {
                console.log('Select all all clicked');
                this.selectAllTransactions('all');
            });
        } else {
            console.error('select-all-all button not found');
        }

        const clearSelectionAllBtn = document.getElementById('clear-selection-all');
        if (clearSelectionAllBtn) {
            clearSelectionAllBtn.addEventListener('click', () => {
                console.log('Clear selection all clicked');
                this.clearSelection('all');
            });
        } else {
            console.error('clear-selection-all button not found');
        }

        const bulkEditAllBtn = document.getElementById('bulk-edit-all');
        if (bulkEditAllBtn) {
            bulkEditAllBtn.addEventListener('click', () => {
                console.log('Bulk edit all clicked');
                this.openBulkEditModal('all');
            });
        } else {
            console.error('bulk-edit-all button not found');
        }

        const bulkDeleteAllBtn = document.getElementById('bulk-delete-all');
        if (bulkDeleteAllBtn) {
            bulkDeleteAllBtn.addEventListener('click', () => {
                console.log('Bulk delete all clicked');
                this.bulkDeleteTransactions('all');
            });
        } else {
            console.error('bulk-delete-all button not found');
        }

        // Bulk edit modal
        const closeBulkEditBtn = document.getElementById('close-bulk-edit-modal');
        if (closeBulkEditBtn) {
            closeBulkEditBtn.addEventListener('click', () => {
                console.log('Close bulk edit modal clicked');
                this.closeModal('bulk-edit-modal');
            });
        } else {
            console.error('close-bulk-edit-modal button not found');
        }

        const cancelBulkEditBtn = document.getElementById('cancel-bulk-edit');
        if (cancelBulkEditBtn) {
            cancelBulkEditBtn.addEventListener('click', () => {
                console.log('Cancel bulk edit clicked');
                this.closeModal('bulk-edit-modal');
            });
        } else {
            console.error('cancel-bulk-edit button not found');
        }

        const bulkEditForm = document.getElementById('bulk-edit-form');
        if (bulkEditForm) {
            bulkEditForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Bulk edit form submitted');
                this.applyBulkEdit();
            });
        } else {
            console.error('bulk-edit-form not found');
        }

        // Bulk edit checkboxes
        const bulkEditTypeCheckbox = document.getElementById('bulk-edit-type-checkbox');
        if (bulkEditTypeCheckbox) {
            bulkEditTypeCheckbox.addEventListener('change', (e) => {
                const typeSelect = document.getElementById('bulk-edit-type');
                if (typeSelect) {
                    typeSelect.disabled = !e.target.checked;
                }
            });
        } else {
            console.error('bulk-edit-type-checkbox not found');
        }

        const bulkEditCategoryCheckbox = document.getElementById('bulk-edit-category-checkbox');
        if (bulkEditCategoryCheckbox) {
            bulkEditCategoryCheckbox.addEventListener('change', (e) => {
                const categorySelect = document.getElementById('bulk-edit-category');
                if (categorySelect) {
                    categorySelect.disabled = !e.target.checked;
                }
            });
        } else {
            console.error('bulk-edit-category-checkbox not found');
        }

        const bulkEditDateCheckbox = document.getElementById('bulk-edit-date-checkbox');
        if (bulkEditDateCheckbox) {
            bulkEditDateCheckbox.addEventListener('change', (e) => {
                const dateInput = document.getElementById('bulk-edit-date');
                if (dateInput) {
                    dateInput.disabled = !e.target.checked;
                }
            });
        } else {
            console.error('bulk-edit-date-checkbox not found');
        }

        // Initialize filter categories
        this.updateFilterCategories();
    }

    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;

        // Refresh content if needed
        if (tabName === 'dashboard') {
            this.updateDashboard();
            this.updateChart();
        } else if (tabName === 'all-transactions') {
            this.renderAllTransactions();
            this.updateAllTransactionsStats();
        }
    }

    switchTransactionType(type) {
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('active');

        this.currentTransactionType = type;
        this.updateCategoryOptions();
    }

    updateCategoryOptions() {
        const categorySelect = document.getElementById('trans-category');
        const expenseCategories = [
            { value: 'office-supplies', label: 'Office Supplies' },
            { value: 'travel', label: 'Travel & Transport' },
            { value: 'meals', label: 'Meals & Entertainment' },
            { value: 'utilities', label: 'Utilities' },
            { value: 'marketing', label: 'Marketing' },
            { value: 'professional-services', label: 'Professional Services' },
            { value: 'equipment', label: 'Equipment' },
            { value: 'rent', label: 'Rent & Premises' },
            { value: 'insurance', label: 'Insurance' },
            { value: 'other', label: 'Other Expenses' }
        ];

        const incomeCategories = [
            { value: 'sales', label: 'Sales Revenue' },
            { value: 'services', label: 'Service Income' },
            { value: 'consulting', label: 'Consulting' },
            { value: 'interest', label: 'Interest Income' },
            { value: 'other-income', label: 'Other Income' }
        ];

        const categories = this.currentTransactionType === 'expense' ? expenseCategories : incomeCategories;
        
        categorySelect.innerHTML = '<option value="">Select category</option>';
        categories.forEach(cat => {
            categorySelect.innerHTML += `<option value="${cat.value}">${cat.label}</option>`;
        });
    }

    addTransaction() {
        const form = document.getElementById('transaction-form');
        const editingId = form.dataset.editingId;
        
        const transactionData = {
            type: this.currentTransactionType,
            amount: parseFloat(document.getElementById('trans-amount').value),
            category: document.getElementById('trans-category').value,
            description: document.getElementById('trans-description').value,
            date: document.getElementById('trans-date').value,
            paymentMethod: document.getElementById('trans-payment-method').value,
        };

        if (!transactionData.amount || !transactionData.category || !transactionData.description || !transactionData.date) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        if (editingId) {
            // Update existing transaction
            const index = this.transactions.findIndex(t => t.id === editingId);
            if (index !== -1) {
                this.transactions[index] = {
                    ...this.transactions[index],
                    ...transactionData,
                    timestamp: new Date().toISOString()
                };
                this.showToast('Transaction updated successfully!', 'success');
            }
            delete form.dataset.editingId;
        } else {
            // Add new transaction
            const transaction = {
                id: Date.now().toString(),
                ...transactionData,
                timestamp: new Date().toISOString()
            };
        this.transactions.unshift(transaction);
            this.showToast('Transaction added successfully!', 'success');
        }

        this.saveData();
        this.updateDashboard();
        this.renderTransactions();
        this.renderAllTransactions();
        this.updateChart();
        this.updateFilterCategories();
        this.updateAllTransactionsStats();
        
        form.reset();
        this.setDefaultDates();
    }

    handleReceiptUpload(event) {
        console.log('handleReceiptUpload called', event);
        
        const files = event.target.files;
        console.log('Files available:', files.length);
        
        if (!files || files.length === 0) {
            console.log('No files selected or user cancelled');
            return;
        }

        const file = files[0];
        console.log('Processing file:', {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: new Date(file.lastModified)
        });

        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file', 'error');
            console.error('Invalid file type:', file.type);
            return;
        }

        // Check file size (limit to 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showToast('Image too large. Please select an image under 10MB', 'error');
            console.error('File too large:', file.size);
            return;
        }

        // Show processing message
        this.showToast('Processing image...', 'success');
        console.log('Starting to process image...');

        const reader = new FileReader();
        
        reader.onloadstart = () => {
            console.log('FileReader started loading');
        };
        
        reader.onprogress = (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                console.log('Loading progress:', percentComplete.toFixed(1) + '%');
            }
        };
        
        reader.onload = async (e) => {
            console.log('FileReader completed. Result length:', e.target.result?.length);
            
            if (e.target.result && e.target.result.length > 0) {
                this.currentReceiptImage = e.target.result;
                console.log('Image stored in currentReceiptImage');
                
                // Show success message and form
                this.showToast('Image loaded successfully! 📸', 'success');
                this.showReceiptForm();
                
                // Add a preview to the form
                this.addImagePreview(e.target.result);
            } else {
                console.error('FileReader result is empty');
                this.showToast('Error: Image data is empty', 'error');
            }
        };
        
        reader.onerror = (e) => {
            console.error('FileReader error:', e);
            this.showToast('Error reading image file', 'error');
        };
        
        reader.onabort = () => {
            console.log('FileReader aborted');
            this.showToast('Image loading was cancelled', 'error');
        };
        
        // Start reading the file
        try {
        reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error starting FileReader:', error);
            this.showToast('Error starting image processing', 'error');
        }
    }

    showReceiptForm() {
        document.getElementById('upload-area').style.display = 'none';
        document.getElementById('receipt-form').style.display = 'block';
        document.getElementById('receipt-date').value = new Date().toISOString().split('T')[0];
        
        console.log('Receipt form shown');
    }

    addImagePreview(imageSrc) {
        try {
            console.log('Adding image preview...');
            
            // Remove existing preview if any
            const existingPreview = document.getElementById('image-preview');
            if (existingPreview) {
                existingPreview.remove();
                console.log('Removed existing preview');
            }

            // Create new preview
            const previewContainer = document.createElement('div');
            previewContainer.id = 'image-preview';
            previewContainer.innerHTML = `
                <div style="margin-bottom: 1rem; text-align: center;">
                    <h4 style="color: #10b981; margin-bottom: 0.5rem;">✅ Image Captured</h4>
                    <img src="${imageSrc}" style="max-width: 200px; max-height: 150px; border-radius: 8px; border: 2px solid #10b981;" alt="Receipt Preview">
                    <p style="font-size: 0.85rem; color: #666; margin-top: 0.5rem;">Image ready for saving</p>
                </div>
            `;

            // Insert preview at the top of the receipt form
            const receiptForm = document.getElementById('receipt-form');
            if (receiptForm) {
                receiptForm.insertBefore(previewContainer, receiptForm.firstChild);
                console.log('Image preview added to form successfully');
            } else {
                console.warn('Receipt form not found, cannot add preview - this is normal during form transition');
                // Don't throw error, just log it as a warning
            }
        } catch (error) {
            console.warn('Error in addImagePreview (non-critical):', error);
            // Don't throw the error, just log it as a warning to prevent breaking the save process
        }
    }


    async saveReceipt() {
        const amount = parseFloat(document.getElementById('receipt-amount').value);
        const category = document.getElementById('receipt-category').value;
        const description = document.getElementById('receipt-description').value;
        const date = document.getElementById('receipt-date').value;

        console.log('Saving receipt:', { amount, category, description, date });
        console.log('Current receipt image exists:', !!this.currentReceiptImage);

        if (!amount || !category || !date) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        if (!this.currentReceiptImage) {
            this.showToast('No image selected. Please take a photo first.', 'error');
            return;
        }

        try {
            const receiptId = Date.now().toString();
            
            // Store image in IndexedDB if available, otherwise use localStorage
            const imageReference = await this.storeImageInDB(
                receiptId, 
                this.currentReceiptImage,
                {
                    receiptId: receiptId,
                    amount: amount,
                    category: category,
                    description: description || 'Receipt'
                }
            );

        const receipt = {
                id: receiptId,
            amount: amount,
            category: category,
            description: description || 'Receipt',
            date: date,
                image: imageReference, // This will be either IndexedDB reference or original data
            timestamp: new Date().toISOString()
        };

        // Also add as transaction
        const transaction = {
            id: (Date.now() + 1).toString(),
            type: 'expense',
            amount: amount,
            category: category,
            description: description || 'Receipt expense',
            date: date,
            paymentMethod: 'card',
            receiptId: receipt.id,
            timestamp: new Date().toISOString()
        };

            console.log('Adding receipt:', receipt);
            console.log('Adding transaction:', transaction);

        this.receipts.unshift(receipt);
        this.transactions.unshift(transaction);
            
            // Save data with error handling
            try {
        this.saveData();
                console.log('Data saved successfully');
            } catch (saveError) {
                console.error('Error saving data:', saveError);
                this.showToast('Error saving data to storage', 'error');
                return;
            }
            
        this.updateDashboard();
        this.renderTransactions();
            this.renderAllTransactions();
        this.renderReceipts();
        this.updateChart();
            this.updateFilterCategories();
            this.updateAllTransactionsStats();
        
        this.cancelReceipt();
        this.showToast('Receipt saved successfully!', 'success');
            
        } catch (error) {
            console.error('Error saving receipt:', error);
            this.showToast('Error saving receipt: ' + error.message, 'error');
        }
    }

    cancelReceipt() {
        document.getElementById('upload-area').style.display = 'block';
        document.getElementById('receipt-form').style.display = 'none';
        document.getElementById('receipt-input').value = '';
        document.getElementById('receipt-amount').value = '';
        document.getElementById('receipt-category').value = '';
        document.getElementById('receipt-description').value = '';
        
        // Remove image preview
        const existingPreview = document.getElementById('image-preview');
        if (existingPreview) {
            existingPreview.remove();
        }
        
        this.currentReceiptImage = null;
        console.log('Receipt cancelled and cleaned up');
    }

    updateDashboard() {
        const totalIncome = this.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = this.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const netProfit = totalIncome - totalExpenses;

        document.getElementById('total-income').textContent = this.formatCurrency(totalIncome);
        document.getElementById('total-expenses').textContent = this.formatCurrency(totalExpenses);
        document.getElementById('net-profit').textContent = this.formatCurrency(netProfit);
        document.getElementById('monthly-total').textContent = this.formatCurrency(netProfit);

        // Update recent transactions
        const recentContainer = document.getElementById('recent-list');
        const recentTransactions = this.transactions.slice(0, 5);
        
        if (recentTransactions.length === 0) {
            recentContainer.innerHTML = '<p class="no-data">No transactions yet. Start by adding some entries!</p>';
        } else {
            recentContainer.innerHTML = recentTransactions
                .map(t => this.createTransactionHTML(t, false, 'recent'))
                .join('');
        }
    }

    renderTransactions() {
        const container = document.getElementById('transactions-container');
        const transactionsToShow = this.filteredTransactions.length > 0 ? this.filteredTransactions : this.transactions;
        
        if (transactionsToShow.length === 0) {
            container.innerHTML = '<p class="no-data">No transactions found.</p>';
            return;
        }

        container.innerHTML = transactionsToShow
            .map(t => this.createTransactionHTML(t, true))
            .join('');
    }

    renderReceipts() {
        const container = document.getElementById('receipts-container');
        
        if (this.receipts.length === 0) {
            container.innerHTML = '<p class="no-data">No receipts uploaded yet.</p>';
            return;
        }

        container.innerHTML = this.receipts
            .map(r => this.createReceiptHTML(r))
            .join('');
    }

    createTransactionHTML(transaction, showActions = false, context = null) {
        const date = new Date(transaction.date).toLocaleDateString('en-GB');
        const categoryLabel = this.getCategoryLabel(transaction.category);
        
        // Check if transaction has associated receipt with image
        const hasReceipt = transaction.receiptId && this.receipts.find(r => r.id === transaction.receiptId);
        const hasImage = hasReceipt && hasReceipt.image && hasReceipt.image.startsWith('data:image/');
        
        const imageIndicator = hasImage ? 
            '<i class="fas fa-camera transaction-image-icon" title="Has receipt image"></i>' : 
            '';

        // Determine if we're in selection mode
        const inSelectionMode = context && this.selectionMode[context];
        const isSelected = context && this.selectedTransactions[context].has(transaction.id);
        
        // Checkbox for selection mode
        const checkboxHTML = inSelectionMode ? `
            <input type="checkbox" 
                   class="transaction-checkbox transaction-checkbox-${context}" 
                   data-transaction-id="${transaction.id}"
                   ${isSelected ? 'checked' : ''}
                   onchange="expenseTracker.toggleTransactionSelection('${transaction.id}', '${context}')">
        ` : '';
        
        const actionsHTML = showActions ? `
            <div class="transaction-actions">
                <button class="action-btn view" onclick="expenseTracker.viewTransactionDetails('${transaction.id}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                ${hasImage ? `
                    <button class="action-btn delete-image" onclick="expenseTracker.deleteTransactionImage('${transaction.id}')" title="Delete Image">
                        <i class="fas fa-image"></i>
                    </button>
                ` : ''}
                <button class="action-btn share" onclick="expenseTracker.shareTransaction('${transaction.id}')" title="Share">
                    <i class="fas fa-share"></i>
                </button>
                <button class="action-btn edit" onclick="expenseTracker.editTransaction('${transaction.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="expenseTracker.deleteTransaction('${transaction.id}')" title="Delete Transaction">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        ` : '';
        
        const clickHandler = (showActions || inSelectionMode) ? '' : `onclick="expenseTracker.viewTransactionDetails('${transaction.id}')"`;
        const selectionClass = inSelectionMode ? 'selection-mode' : '';
        const selectedClass = isSelected ? 'selected' : '';
        
        return `
            <div class="transaction-item ${selectionClass} ${selectedClass}" ${clickHandler} style="${(!showActions && !inSelectionMode) ? 'cursor: pointer;' : ''}">
                ${checkboxHTML}
                <div class="transaction-info">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <h4>${transaction.description}</h4>
                        ${imageIndicator}
                    </div>
                    <p>${categoryLabel} • ${date}</p>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                    </div>
                    ${actionsHTML}
                </div>
            </div>
        `;
    }

    createReceiptHTML(receipt) {
        const date = new Date(receipt.date).toLocaleDateString('en-GB');
        const categoryLabel = this.getCategoryLabel(receipt.category);
        
        // Check if image exists and is valid (supports both localStorage and IndexedDB)
        const hasValidImage = receipt.image && (
            receipt.image.startsWith('data:image/') || 
            receipt.image.startsWith('indexeddb:')
        );
        
        // Create a placeholder that will be updated with the actual image
        const imageId = `receipt-img-${receipt.id}`;
        const imageHTML = hasValidImage 
            ? `<img id="${imageId}" src="" alt="Receipt" class="receipt-thumbnail" style="display: none;">
               <div id="${imageId}-loading" class="receipt-thumbnail loading-image">
                   <i class="fas fa-spinner fa-spin"></i>
                   <span>Loading...</span>
               </div>`
            : `<div class="receipt-thumbnail no-image">
                 <i class="fas fa-image"></i>
                 <span>No Image</span>
               </div>`;
        
        // Load image asynchronously if it exists
        if (hasValidImage) {
            setTimeout(async () => {
                const imageUrl = await this.getImageFromDB(receipt.image);
                const imgElement = document.getElementById(imageId);
                const loadingElement = document.getElementById(`${imageId}-loading`);
                
                if (imgElement && imageUrl) {
                    imgElement.src = imageUrl;
                    imgElement.style.display = 'block';
                    if (loadingElement) loadingElement.style.display = 'none';
                } else if (loadingElement) {
                    loadingElement.innerHTML = `
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Error</span>
                    `;
                }
            }, 10);
        }
        
        return `
            <div class="receipt-item">
                ${imageHTML}
                <div class="receipt-info">
                    <h4>${receipt.description}</h4>
                    <p>${categoryLabel} • ${date}</p>
                    ${!hasValidImage ? '<p class="image-status">⚠️ Image not saved</p>' : ''}
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                <div class="receipt-amount">
                    ${this.formatCurrency(receipt.amount)}
                    </div>
                    <div class="receipt-actions">
                        <button class="action-btn delete" onclick="expenseTracker.deleteReceipt('${receipt.id}')" title="Delete Receipt">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getCategoryLabel(category) {
        const categories = {
            'office-supplies': 'Office Supplies',
            'travel': 'Travel & Transport',
            'meals': 'Meals & Entertainment',
            'utilities': 'Utilities',
            'marketing': 'Marketing',
            'professional-services': 'Professional Services',
            'equipment': 'Equipment',
            'rent': 'Rent & Premises',
            'insurance': 'Insurance',
            'sales': 'Sales Revenue',
            'services': 'Service Income',
            'consulting': 'Consulting',
            'interest': 'Interest Income',
            'other-income': 'Other Income',
            'other': 'Other'
        };
        return categories[category] || category;
    }

    initializeChart() {
        const ctx = document.getElementById('monthlyChart').getContext('2d');
        
        const monthlyData = this.getMonthlyData();
        
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthlyData.labels,
                datasets: [{
                    label: 'Income',
                    data: monthlyData.income,
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 1
                }, {
                    label: 'Expenses',
                    data: monthlyData.expenses,
                    backgroundColor: '#ef4444',
                    borderColor: '#dc2626',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '£' + value.toFixed(0);
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': £' + context.parsed.y.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }

    updateChart() {
        if (!this.chart) return;
        
        const monthlyData = this.getMonthlyData();
        this.chart.data.labels = monthlyData.labels;
        this.chart.data.datasets[0].data = monthlyData.income;
        this.chart.data.datasets[1].data = monthlyData.expenses;
        this.chart.update();
    }

    getMonthlyData() {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentDate = new Date();
        const labels = [];
        const income = [];
        const expenses = [];

        // Get last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            labels.push(months[date.getMonth()]);
            
            const monthTransactions = this.transactions.filter(t => t.date.startsWith(monthKey));
            
            income.push(monthTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0));
                
            expenses.push(monthTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0));
        }

        return { labels, income, expenses };
    }

    exportToCSV() {
        const fromDate = document.getElementById('export-from').value;
        const toDate = document.getElementById('export-to').value;
        
        let filteredTransactions = this.transactions;
        
        if (fromDate || toDate) {
            filteredTransactions = this.transactions.filter(t => {
                const transDate = new Date(t.date);
                const from = fromDate ? new Date(fromDate) : new Date('1900-01-01');
                const to = toDate ? new Date(toDate) : new Date('2100-12-31');
                return transDate >= from && transDate <= to;
            });
        }

        if (filteredTransactions.length === 0) {
            this.showToast('No transactions found for the selected date range', 'error');
            return;
        }

        const headers = ['Date', 'Type', 'Category', 'Description', 'Amount (£)', 'Payment Method'];
        const csvContent = [
            headers.join(','),
            ...filteredTransactions.map(t => [
                t.date,
                t.type,
                this.getCategoryLabel(t.category),
                `"${t.description}"`,
                t.amount.toFixed(2),
                t.paymentMethod || 'N/A'
            ].join(','))
        ].join('\n');

        this.downloadFile(csvContent, 'business-transactions.csv', 'text/csv');
        this.showToast('CSV file downloaded successfully!', 'success');
    }

    generateSummaryReport() {
        const fromDate = document.getElementById('export-from').value;
        const toDate = document.getElementById('export-to').value;
        
        let filteredTransactions = this.transactions;
        let dateRange = 'All Time';
        
        if (fromDate || toDate) {
            filteredTransactions = this.transactions.filter(t => {
                const transDate = new Date(t.date);
                const from = fromDate ? new Date(fromDate) : new Date('1900-01-01');
                const to = toDate ? new Date(toDate) : new Date('2100-12-31');
                return transDate >= from && transDate <= to;
            });
            
            if (fromDate && toDate) {
                dateRange = `${fromDate} to ${toDate}`;
            } else if (fromDate) {
                dateRange = `From ${fromDate}`;
            } else if (toDate) {
                dateRange = `Until ${toDate}`;
            }
        }

        const totalIncome = filteredTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const netProfit = totalIncome - totalExpenses;

        // Category breakdown
        const expensesByCategory = {};
        filteredTransactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                const category = this.getCategoryLabel(t.category);
                expensesByCategory[category] = (expensesByCategory[category] || 0) + t.amount;
            });

        const report = `
BUSINESS FINANCIAL SUMMARY REPORT
Period: ${dateRange}
Generated: ${new Date().toLocaleDateString('en-GB')}

OVERVIEW
========
Total Income: £${totalIncome.toFixed(2)}
Total Expenses: £${totalExpenses.toFixed(2)}
Net Profit: £${netProfit.toFixed(2)}

EXPENSE BREAKDOWN BY CATEGORY
============================
${Object.entries(expensesByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => `${category}: £${amount.toFixed(2)}`)
    .join('\n')}

TRANSACTION COUNT
================
Total Transactions: ${filteredTransactions.length}
Income Transactions: ${filteredTransactions.filter(t => t.type === 'income').length}
Expense Transactions: ${filteredTransactions.filter(t => t.type === 'expense').length}
Receipts Uploaded: ${this.receipts.length}

This report was generated by Business Expense Tracker
        `.trim();

        this.downloadFile(report, 'business-summary-report.txt', 'text/plain');
        this.showToast('Summary report generated successfully!', 'success');
    }

    shareReceipts() {
        if (this.receipts.length === 0) {
            this.showToast('No receipts to share', 'error');
            return;
        }

        // In a real app, you would create a zip file here
        // For this demo, we'll create a simple HTML page with all receipts
        const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Business Receipts</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .receipt { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; }
        .receipt img { max-width: 300px; height: auto; }
        .receipt-info { margin-bottom: 10px; }
    </style>
</head>
<body>
    <h1>Business Receipts</h1>
    <p>Generated: ${new Date().toLocaleDateString('en-GB')}</p>
    ${this.receipts.map(r => `
        <div class="receipt">
            <div class="receipt-info">
                <strong>Amount:</strong> £${r.amount.toFixed(2)}<br>
                <strong>Date:</strong> ${new Date(r.date).toLocaleDateString('en-GB')}<br>
                <strong>Category:</strong> ${this.getCategoryLabel(r.category)}<br>
                <strong>Description:</strong> ${r.description}
            </div>
            <img src="${r.image}" alt="Receipt">
        </div>
    `).join('')}
</body>
</html>
        `;

        this.downloadFile(receiptHTML, 'business-receipts.html', 'text/html');
        this.showToast('Receipts package created successfully!', 'success');
    }

    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('trans-date').value = today;
        
        // Set export date range to current month
        const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        document.getElementById('export-from').value = firstDay;
        document.getElementById('export-to').value = today;
    }

    saveData() {
        try {
            const transactionsStr = JSON.stringify(this.transactions);
            const receiptsStr = JSON.stringify(this.receipts);
            
            console.log('Saving data:', {
                transactions: this.transactions.length,
                receipts: this.receipts.length,
                transactionsSize: transactionsStr.length,
                receiptsSize: receiptsStr.length
            });
            
            localStorage.setItem('transactions', transactionsStr);
            localStorage.setItem('receipts', receiptsStr);
            
            console.log('Data saved successfully to localStorage');
            
        } catch (error) {
            console.error('Error saving data:', error);
            
            if (error.name === 'QuotaExceededError') {
                this.showToast('Storage quota exceeded. Please delete some receipts or export your data.', 'error');
                
                // Try to save without images as fallback
                try {
                    const receiptsWithoutImages = this.receipts.map(r => ({
                        ...r,
                        image: r.image ? '[Image removed due to storage limit]' : r.image
                    }));
                    
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
                    localStorage.setItem('receipts', JSON.stringify(receiptsWithoutImages));
                    
                    this.showToast('Data saved without images due to storage limit', 'error');
                } catch (fallbackError) {
                    this.showToast('Failed to save data even without images', 'error');
                    throw fallbackError;
                }
            } else {
                this.showToast('Error saving data: ' + error.message, 'error');
                throw error;
            }
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP'
        }).format(amount);
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        document.getElementById('toast-container').appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Modal Management
    openModal(modalId) {
        console.log(`Opening modal: ${modalId}`);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            console.log(`Modal ${modalId} opened`);
        } else {
            console.error(`Modal not found: ${modalId}`);
        }
    }

    closeModal(modalId) {
        console.log(`Closing modal: ${modalId}`);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            console.log(`Modal ${modalId} closed`);
        } else {
            console.error(`Modal not found: ${modalId}`);
        }
    }

    // Search Functionality
    performSearch(query) {
        const results = document.getElementById('search-results');
        
        if (!query.trim()) {
            results.innerHTML = '<p class="no-data">Start typing to search transactions...</p>';
            return;
        }

        const searchResults = this.transactions.filter(t => 
            t.description.toLowerCase().includes(query.toLowerCase()) ||
            t.amount.toString().includes(query) ||
            this.getCategoryLabel(t.category).toLowerCase().includes(query.toLowerCase())
        );

        if (searchResults.length === 0) {
            results.innerHTML = '<p class="no-data">No transactions found.</p>';
            return;
        }

        results.innerHTML = searchResults
            .map(t => this.createTransactionHTML(t, false, null))
            .join('');
    }

    // All Transactions Tab Functionality
    renderAllTransactions() {
        const container = document.getElementById('all-transactions-container');
        const transactionsToShow = this.filteredTransactions.length > 0 ? this.filteredTransactions : this.transactions;
        
        if (transactionsToShow.length === 0) {
            container.innerHTML = '<p class="no-data">No transactions found.</p>';
            return;
        }

        container.innerHTML = transactionsToShow
            .map(t => this.createTransactionHTML(t, true, 'all'))
            .join('');
    }

    updateAllTransactionsStats() {
        const totalCount = this.transactions.length;
        const withImagesCount = this.transactions.filter(t => {
            const hasReceipt = t.receiptId && this.receipts.find(r => r.id === t.receiptId);
            return hasReceipt && hasReceipt.image && (
                hasReceipt.image.startsWith('data:image/') || 
                hasReceipt.image.startsWith('indexeddb:')
            );
        }).length;

        document.getElementById('total-transactions-count').textContent = totalCount;
        document.getElementById('transactions-with-images').textContent = withImagesCount;
    }

    toggleAllFilterBar() {
        const filterBar = document.getElementById('all-filter-bar');
        const isVisible = filterBar.style.display !== 'none';
        filterBar.style.display = isVisible ? 'none' : 'block';
    }

    updateAllFilterCategories() {
        const categorySelect = document.getElementById('all-filter-category');
        const allCategories = new Set();
        
        this.transactions.forEach(t => allCategories.add(t.category));
        
        categorySelect.innerHTML = '<option value="">All Categories</option>';
        Array.from(allCategories).forEach(category => {
            categorySelect.innerHTML += `<option value="${category}">${this.getCategoryLabel(category)}</option>`;
        });
    }

    applyAllFilters() {
        const { type, category, search } = this.activeFilters;
        
        this.filteredTransactions = this.transactions.filter(t => {
            const matchesType = !type || t.type === type;
            const matchesCategory = !category || t.category === category;
            const matchesSearch = !search || 
                t.description.toLowerCase().includes(search.toLowerCase()) ||
                this.getCategoryLabel(t.category).toLowerCase().includes(search.toLowerCase());
            
            return matchesType && matchesCategory && matchesSearch;
        });

        this.renderAllTransactions();
    }

    clearAllFilters() {
        this.activeFilters = { type: '', category: '', search: '' };
        document.getElementById('all-filter-type').value = '';
        document.getElementById('all-filter-category').value = '';
        document.getElementById('all-filter-search').value = '';
        this.filteredTransactions = [];
        this.renderAllTransactions();
    }

    // Legacy Filter Functionality (kept for compatibility)
    updateFilterCategories() {
        this.updateAllFilterCategories();
    }

    // Backup and Restore
    downloadBackup() {
        const backupData = {
            transactions: this.transactions,
            receipts: this.receipts,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };

        const dataStr = JSON.stringify(backupData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `business-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.closeModal('backup-modal');
        this.showToast('Backup downloaded successfully!', 'success');
    }

    restoreBackup(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const backupData = JSON.parse(e.target.result);
                
                if (!backupData.transactions || !backupData.receipts) {
                    throw new Error('Invalid backup file format');
                }

                const confirmed = confirm('This will replace all your current data. Are you sure you want to restore from backup?');
                if (!confirmed) return;

                this.transactions = backupData.transactions;
                this.receipts = backupData.receipts;
                this.saveData();
                
                this.updateDashboard();
                this.renderTransactions();
                this.renderReceipts();
                this.updateChart();
                this.updateFilterCategories();
                
                this.closeModal('backup-modal');
                this.showToast('Data restored successfully!', 'success');
                
            } catch (error) {
                this.showToast('Error restoring backup: Invalid file format', 'error');
            }
        };
        reader.readAsText(file);
    }

    // Share Functionality
    shareSummary() {
        const totalIncome = this.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = this.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const netProfit = totalIncome - totalExpenses;

        const summaryText = `📊 Business Summary Report
        
💰 Total Income: ${this.formatCurrency(totalIncome)}
💸 Total Expenses: ${this.formatCurrency(totalExpenses)}
📈 Net Profit: ${this.formatCurrency(netProfit)}

📱 Generated by Business Expense Tracker
🌐 Access at: ${window.location.href}`;

        this.shareText(summaryText);
        this.closeModal('share-modal');
    }

    shareTransactionsList() {
        if (this.transactions.length === 0) {
            this.showToast('No transactions to share', 'error');
            return;
        }

        const transactionText = `📋 Recent Transactions

${this.transactions.slice(0, 10).map(t => {
    const date = new Date(t.date).toLocaleDateString('en-GB');
    const amount = this.formatCurrency(t.amount);
    const sign = t.type === 'income' ? '+' : '-';
    return `${sign}${amount} - ${t.description} (${date})`;
}).join('\n')}

📱 Generated by Business Expense Tracker
🌐 Access at: ${window.location.href}`;

        this.shareText(transactionText);
        this.closeModal('share-modal');
    }

    shareTransaction(transactionId) {
        const transaction = this.transactions.find(t => t.id === transactionId);
        if (!transaction) return;

        const date = new Date(transaction.date).toLocaleDateString('en-GB');
        const amount = this.formatCurrency(transaction.amount);
        const sign = transaction.type === 'income' ? '+' : '-';
        const category = this.getCategoryLabel(transaction.category);

        const transactionText = `💼 Transaction Details

${sign}${amount}
📝 ${transaction.description}
📂 ${category}
📅 ${date}
💳 ${transaction.paymentMethod || 'N/A'}

📱 From Business Expense Tracker`;

        this.shareText(transactionText);
    }

    shareAppURL() {
        const url = window.location.href;
        
        if (navigator.share) {
            navigator.share({
                title: 'Business Expense Tracker',
                text: 'Check out this business expense tracking app!',
                url: url
            });
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                this.showToast('App URL copied to clipboard!', 'success');
            });
        } else {
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('App URL copied to clipboard!', 'success');
        }
        this.closeModal('share-modal');
    }

    shareText(text) {
        if (navigator.share) {
            navigator.share({
                title: 'Business Expense Tracker',
                text: text
            }).catch((error) => {
                console.log('Error sharing:', error);
                this.fallbackShare(text);
            });
        } else {
            this.fallbackShare(text);
        }
    }

    fallbackShare(text) {
        // Try different sharing methods
        const encodedText = encodeURIComponent(text);
        const subject = encodeURIComponent('Business Expense Tracker Report');
        
        // Create share options modal
        const shareModal = document.createElement('div');
        shareModal.className = 'modal active';
        shareModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Share Options</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="share-options">
                        <button class="btn-primary share-option" onclick="window.open('mailto:?subject=${subject}&body=${encodedText}')">
                            <i class="fas fa-envelope"></i>
                            <span>Share via Email</span>
                        </button>
                        <button class="btn-primary share-option" onclick="window.open('sms:?&body=${encodedText}')">
                            <i class="fas fa-sms"></i>
                            <span>Share via SMS</span>
                        </button>
                        <button class="btn-primary share-option" onclick="window.open('https://wa.me/?text=${encodedText}')">
                            <i class="fab fa-whatsapp"></i>
                            <span>Share via WhatsApp</span>
                        </button>
                        <button class="btn-primary share-option" onclick="expenseTracker.copyToClipboard('${text.replace(/'/g, "\\'")}'); this.closest('.modal').remove();">
                            <i class="fas fa-copy"></i>
                            <span>Copy to Clipboard</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(shareModal);
        
        // Remove modal when clicking backdrop
        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) {
                shareModal.remove();
            }
        });
    }

    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showToast('Content copied to clipboard!', 'success');
            });
        } else {
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('Content copied to clipboard!', 'success');
        }
    }

    // Transaction Management
    editTransaction(transactionId) {
        const transaction = this.transactions.find(t => t.id === transactionId);
        if (!transaction) return;

        // Switch to transactions tab and populate form
        this.switchTab('transactions');
        
        document.getElementById('trans-amount').value = transaction.amount;
        document.getElementById('trans-description').value = transaction.description;
        document.getElementById('trans-date').value = transaction.date;
        document.getElementById('trans-payment-method').value = transaction.paymentMethod || 'card';
        
        // Set transaction type
        this.switchTransactionType(transaction.type);
        
        // Set category after type is switched
        setTimeout(() => {
            document.getElementById('trans-category').value = transaction.category;
        }, 100);

        // Store the ID for updating instead of creating new
        document.getElementById('transaction-form').dataset.editingId = transactionId;
        
        this.showToast('Transaction loaded for editing', 'success');
    }

    async deleteTransaction(transactionId) {
        if (!confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) return;

        const transaction = this.transactions.find(t => t.id === transactionId);
        if (!transaction) {
            this.showToast('Transaction not found', 'error');
            return;
        }

        // Remove associated receipt and image if exists
        const associatedReceipt = this.receipts.find(r => r.id === transaction.receiptId);
        if (associatedReceipt) {
            // Delete image from IndexedDB if it exists
            if (associatedReceipt.image && associatedReceipt.image.startsWith('indexeddb:')) {
                await this.deleteImageFromDB(associatedReceipt.image);
            }
            this.receipts = this.receipts.filter(r => r.id !== associatedReceipt.id);
            this.renderReceipts();
        }

        // Remove transaction
        this.transactions = this.transactions.filter(t => t.id !== transactionId);
        
        this.saveData();
        this.updateDashboard();
        this.renderTransactions();
        this.updateChart();
        this.updateFilterCategories();
        
        this.showToast('Transaction and associated data deleted successfully', 'success');
    }

    async deleteTransactionImage(transactionId) {
        if (!confirm('Are you sure you want to delete the receipt image? The transaction will remain but the image will be permanently removed.')) return;

        const transaction = this.transactions.find(t => t.id === transactionId);
        if (!transaction || !transaction.receiptId) {
            this.showToast('No receipt image found for this transaction', 'error');
            return;
        }

        const receipt = this.receipts.find(r => r.id === transaction.receiptId);
        if (!receipt) {
            this.showToast('Receipt not found', 'error');
            return;
        }

        // Delete image from IndexedDB if it exists
        if (receipt.image && receipt.image.startsWith('indexeddb:')) {
            await this.deleteImageFromDB(receipt.image);
        }

        // Remove image reference but keep receipt metadata
        receipt.image = null;
        
        this.saveData();
        this.renderTransactions();
        this.renderReceipts();
        
        this.showToast('Receipt image deleted successfully', 'success');
    }

    async deleteReceipt(receiptId) {
        if (!confirm('Are you sure you want to delete this receipt? This will also remove the associated transaction.')) return;

        const receipt = this.receipts.find(r => r.id === receiptId);
        if (!receipt) {
            this.showToast('Receipt not found', 'error');
            return;
        }

        // Delete image from IndexedDB if it exists
        if (receipt.image && receipt.image.startsWith('indexeddb:')) {
            await this.deleteImageFromDB(receipt.image);
        }

        // Remove associated transaction
        const associatedTransaction = this.transactions.find(t => t.receiptId === receiptId);
        if (associatedTransaction) {
            this.transactions = this.transactions.filter(t => t.receiptId !== receiptId);
        }

        // Remove receipt
        this.receipts = this.receipts.filter(r => r.id !== receiptId);
        
        this.saveData();
        this.updateDashboard();
        this.renderTransactions();
        this.renderReceipts();
        this.updateChart();
        this.updateFilterCategories();
        
        this.showToast('Receipt and associated transaction deleted successfully', 'success');
    }

    async checkStorageStatus() {
        try {
            const storageInfo = await this.getStorageInfo();
            
            console.log('📊 Enhanced Storage Status:', {
                transactions: this.transactions.length + ' items',
                receipts: this.receipts.length + ' items',
                localStorage: storageInfo.localStorage.sizeFormatted,
                indexedDB: `${storageInfo.indexedDB.sizeFormatted} (${storageInfo.indexedDB.imageCount} images)`,
                totalStorage: storageInfo.total.sizeFormatted,
                storageType: this.db ? 'IndexedDB + localStorage' : 'localStorage only',
                receiptsWithImages: this.receipts.filter(r => 
                    r.image && (r.image.startsWith('data:image/') || r.image.startsWith('indexeddb:'))
                ).length
            });
            
            // More generous warning since IndexedDB has much higher limits
            const warningThreshold = this.db ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // 50MB for IndexedDB, 5MB for localStorage only
            
            if (storageInfo.total.size > warningThreshold) {
                this.showToast('Storage getting full. Consider exporting and backing up your data.', 'error');
            }
            
            // Show storage upgrade message if using localStorage only
            if (!this.db) {
                console.log('💡 Tip: IndexedDB is not available. Using localStorage with limited capacity.');
            } else {
                console.log('✅ Using IndexedDB for efficient image storage with higher capacity.');
            }
            
        } catch (error) {
            console.error('Error checking storage:', error);
        }
    }

    // Transaction Details View
    viewTransactionDetails(transactionId) {
        const transaction = this.transactions.find(t => t.id === transactionId);
        if (!transaction) {
            this.showToast('Transaction not found', 'error');
            return;
        }

        console.log('Viewing transaction details:', transaction);

        // Find associated receipt if exists
        const receipt = transaction.receiptId ? this.receipts.find(r => r.id === transaction.receiptId) : null;
        
        const date = new Date(transaction.date).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const categoryLabel = this.getCategoryLabel(transaction.category);
        const paymentMethodLabel = this.getPaymentMethodLabel(transaction.paymentMethod);
        
        let detailsHTML = `
            <div class="transaction-details">
                <div class="detail-section">
                    <h4>💰 Transaction Information</h4>
                    <div class="detail-row">
                        <span class="detail-label">Amount:</span>
                        <span class="detail-value ${transaction.type}">
                            ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Type:</span>
                        <span class="detail-value">${transaction.type === 'income' ? '💰 Income' : '💸 Expense'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Category:</span>
                        <span class="detail-value">${categoryLabel}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Description:</span>
                        <span class="detail-value">${transaction.description}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>📅 Date & Payment</h4>
                    <div class="detail-row">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">${date}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Payment Method:</span>
                        <span class="detail-value">${paymentMethodLabel}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Added:</span>
                        <span class="detail-value">${new Date(transaction.timestamp).toLocaleString('en-GB')}</span>
                    </div>
                </div>
        `;

        // Add receipt section if exists
        if (receipt) {
            const hasImage = receipt.image && (
                receipt.image.startsWith('data:image/') || 
                receipt.image.startsWith('indexeddb:')
            );
            
            detailsHTML += `
                <div class="detail-section">
                    <h4>📸 Receipt Information</h4>
                    <div class="detail-row">
                        <span class="detail-label">Receipt ID:</span>
                        <span class="detail-value">${receipt.id}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Image:</span>
                        <span class="detail-value">${hasImage ? '✅ Available' : '❌ Missing'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Storage:</span>
                        <span class="detail-value">${receipt.image?.startsWith('indexeddb:') ? '💾 IndexedDB' : '📝 localStorage'}</span>
                    </div>
                    ${hasImage ? `
                        <div class="receipt-image-container">
                            <div id="detail-image-loading" style="text-align: center; padding: 2rem;">
                                <i class="fas fa-spinner fa-spin"></i> Loading image...
                            </div>
                            <img id="detail-receipt-image" src="" alt="Receipt" class="receipt-image-full" style="display: none;">
                        </div>
                    ` : ''}
                </div>
            `;
            
            // Load image asynchronously if it exists
            if (hasImage) {
                setTimeout(async () => {
                    const imageUrl = await this.getImageFromDB(receipt.image);
                    const imgElement = document.getElementById('detail-receipt-image');
                    const loadingElement = document.getElementById('detail-image-loading');
                    
                    if (imgElement && imageUrl) {
                        imgElement.src = imageUrl;
                        imgElement.style.display = 'block';
                        if (loadingElement) loadingElement.style.display = 'none';
                    } else if (loadingElement) {
                        loadingElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error loading image';
                    }
                }, 100);
            }
        }

        detailsHTML += '</div>';

        document.getElementById('transaction-details-content').innerHTML = detailsHTML;
        this.openModal('transaction-details-modal');
    }

    getPaymentMethodLabel(method) {
        const methods = {
            'cash': '💵 Cash',
            'card': '💳 Card',
            'bank-transfer': '🏦 Bank Transfer',
            'cheque': '📝 Cheque',
            'other': '🔄 Other'
        };
        return methods[method] || method || 'Not specified';
    }

    // IndexedDB Image Storage Methods
    async storeImageInDB(imageId, imageData, metadata = {}) {
        if (!this.db) {
            console.log('IndexedDB not available, using localStorage fallback');
            return imageData; // Return original data for localStorage storage
        }

        try {
            console.log(`Storing image ${imageId} in IndexedDB...`);
            
            // Convert data URL to blob for more efficient storage
            const response = await fetch(imageData);
            const blob = await response.blob();
            
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            
            const imageRecord = {
                id: imageId,
                blob: blob,
                metadata: {
                    ...metadata,
                    storedAt: new Date().toISOString(),
                    size: blob.size,
                    type: blob.type
                }
            };
            
            await store.put(imageRecord);
            console.log(`Image ${imageId} stored successfully in IndexedDB (${blob.size} bytes)`);
            
            // Return a reference ID instead of the full image data
            return `indexeddb:${imageId}`;
            
        } catch (error) {
            console.warn('Error storing image in IndexedDB, using localStorage fallback:', error);
            // Don't show error toast as this is a normal fallback behavior
            return imageData; // Fallback to localStorage
        }
    }

    async getImageFromDB(imageReference) {
        if (!imageReference || !imageReference.startsWith('indexeddb:')) {
            return imageReference; // Return as-is if not an IndexedDB reference
        }

        if (!this.db) {
            console.error('IndexedDB not available for image retrieval');
            return null;
        }

        try {
            const imageId = imageReference.replace('indexeddb:', '');
            console.log(`Retrieving image ${imageId} from IndexedDB...`);
            
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const request = store.get(imageId);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    if (request.result) {
                        const blob = request.result.blob;
                        const url = URL.createObjectURL(blob);
                        console.log(`Image ${imageId} retrieved from IndexedDB`);
                        resolve(url);
                    } else {
                        console.error(`Image ${imageId} not found in IndexedDB`);
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    console.error('Error retrieving image from IndexedDB:', request.error);
                    resolve(null);
                };
            });
            
        } catch (error) {
            console.error('Error accessing IndexedDB for image retrieval:', error);
            return null;
        }
    }

    async getStorageInfo() {
        let indexedDBSize = 0;
        let imageCount = 0;
        
        if (this.db) {
            try {
                const transaction = this.db.transaction(['images'], 'readonly');
                const store = transaction.objectStore('images');
                const request = store.getAll();
                
                const images = await new Promise((resolve) => {
                    request.onsuccess = () => resolve(request.result || []);
                    request.onerror = () => resolve([]);
                });
                
                imageCount = images.length;
                indexedDBSize = images.reduce((total, img) => total + (img.blob?.size || 0), 0);
                
            } catch (error) {
                console.error('Error getting IndexedDB storage info:', error);
            }
        }

        const localStorage = window.localStorage;
        const transactions = localStorage.getItem('transactions') || '';
        const receipts = localStorage.getItem('receipts') || '';
        const localStorageSize = transactions.length + receipts.length;

        return {
            localStorage: {
                size: localStorageSize,
                sizeFormatted: (localStorageSize / 1024).toFixed(2) + ' KB'
            },
            indexedDB: {
                size: indexedDBSize,
                sizeFormatted: indexedDBSize > 1024 * 1024 
                    ? (indexedDBSize / 1024 / 1024).toFixed(2) + ' MB'
                    : (indexedDBSize / 1024).toFixed(2) + ' KB',
                imageCount: imageCount
            },
            total: {
                size: localStorageSize + indexedDBSize,
                sizeFormatted: ((localStorageSize + indexedDBSize) / 1024).toFixed(2) + ' KB'
            }
        };
    }

    async deleteImageFromDB(imageReference) {
        if (!imageReference || !imageReference.startsWith('indexeddb:')) {
            console.log('Not an IndexedDB image reference, nothing to delete');
            return true;
        }

        if (!this.db) {
            console.error('IndexedDB not available for image deletion');
            return false;
        }

        try {
            const imageId = imageReference.replace('indexeddb:', '');
            console.log(`Deleting image ${imageId} from IndexedDB...`);
            
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            
            return new Promise((resolve, reject) => {
                const request = store.delete(imageId);
                
                request.onsuccess = () => {
                    console.log(`Image ${imageId} deleted from IndexedDB successfully`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('Error deleting image from IndexedDB:', request.error);
                    resolve(false);
                };
            });
            
        } catch (error) {
            console.error('Error accessing IndexedDB for image deletion:', error);
            return false;
        }
    }

    // Transaction Management Methods
    async deleteTransaction(transactionId) {
        console.log(`Deleting transaction: ${transactionId}`);
        
        try {
            // Find the transaction
            const transactionIndex = this.transactions.findIndex(t => t.id === transactionId);
            if (transactionIndex === -1) {
                this.showToast('Transaction not found', 'error');
                return;
            }

            const transaction = this.transactions[transactionIndex];
            
            // Delete associated receipt and image if exists
            if (transaction.receiptId) {
                const receiptIndex = this.receipts.findIndex(r => r.id === transaction.receiptId);
                if (receiptIndex !== -1) {
                    const receipt = this.receipts[receiptIndex];
                    
                    // Delete image from IndexedDB if it exists
                    if (receipt.image && receipt.image.startsWith('indexeddb:')) {
                        await this.deleteImageFromDB(receipt.image);
                    }
                    
                    // Remove receipt
                    this.receipts.splice(receiptIndex, 1);
                    console.log('Associated receipt deleted');
                }
            }

            // Remove transaction
            this.transactions.splice(transactionIndex, 1);
            console.log('Transaction deleted');

            // Save data
            this.saveData();
            
            // Update UI
            this.updateDashboard();
            this.renderTransactions();
            this.renderAllTransactions();
            this.renderReceipts();
            this.updateChart();
            this.updateFilterCategories();
            this.updateAllTransactionsStats();
            
            this.showToast('Transaction deleted successfully', 'success');
            
        } catch (error) {
            console.error('Error deleting transaction:', error);
            this.showToast('Error deleting transaction: ' + error.message, 'error');
        }
    }

    async deleteReceipt(receiptId) {
        console.log(`Deleting receipt: ${receiptId}`);
        
        try {
            // Find the receipt
            const receiptIndex = this.receipts.findIndex(r => r.id === receiptId);
            if (receiptIndex === -1) {
                this.showToast('Receipt not found', 'error');
                return;
            }

            const receipt = this.receipts[receiptIndex];
            
            // Delete associated transaction if exists
            const transactionIndex = this.transactions.findIndex(t => t.receiptId === receiptId);
            if (transactionIndex !== -1) {
                this.transactions.splice(transactionIndex, 1);
                console.log('Associated transaction deleted');
            }
            
            // Delete image from IndexedDB if it exists
            if (receipt.image && receipt.image.startsWith('indexeddb:')) {
                await this.deleteImageFromDB(receipt.image);
            }
            
            // Remove receipt
            this.receipts.splice(receiptIndex, 1);
            console.log('Receipt deleted');

            // Save data
            this.saveData();
            
            // Update UI
            this.updateDashboard();
            this.renderTransactions();
            this.renderAllTransactions();
            this.renderReceipts();
            this.updateChart();
            this.updateFilterCategories();
            this.updateAllTransactionsStats();
            
            this.showToast('Receipt deleted successfully', 'success');
            
        } catch (error) {
            console.error('Error deleting receipt:', error);
            this.showToast('Error deleting receipt: ' + error.message, 'error');
        }
    }

    async deleteTransactionImage(transactionId) {
        console.log(`Deleting image for transaction: ${transactionId}`);
        
        try {
            // Find the transaction
            const transaction = this.transactions.find(t => t.id === transactionId);
            if (!transaction) {
                this.showToast('Transaction not found', 'error');
                return;
            }

            if (!transaction.receiptId) {
                this.showToast('No receipt associated with this transaction', 'error');
                return;
            }

            // Find the receipt
            const receipt = this.receipts.find(r => r.id === transaction.receiptId);
            if (!receipt) {
                this.showToast('Receipt not found', 'error');
                return;
            }

            if (!receipt.image) {
                this.showToast('No image associated with this receipt', 'error');
                return;
            }

            // Delete image from IndexedDB if it exists
            if (receipt.image.startsWith('indexeddb:')) {
                await this.deleteImageFromDB(receipt.image);
            }
            
            // Remove image reference from receipt
            receipt.image = null;
            console.log('Image deleted from receipt');

            // Save data
            this.saveData();
            
            // Update UI
            this.updateDashboard();
            this.renderTransactions();
            this.renderAllTransactions();
            this.renderReceipts();
            this.updateChart();
            this.updateFilterCategories();
            this.updateAllTransactionsStats();
            
            this.showToast('Image deleted successfully', 'success');
            
        } catch (error) {
            console.error('Error deleting transaction image:', error);
            this.showToast('Error deleting image: ' + error.message, 'error');
        }
    }

    // Chart Management Methods
    initializeChart() {
        console.log('Initializing chart...');
        try {
            const ctx = document.getElementById('monthlyChart');
            if (!ctx) {
                console.error('Chart canvas not found');
                return;
            }

            // Destroy existing chart if it exists
            if (this.chart) {
                this.chart.destroy();
            }

            this.chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Income',
                        data: [],
                        backgroundColor: '#10b981',
                        borderColor: '#059669',
                        borderWidth: 1
                    }, {
                        label: 'Expenses',
                        data: [],
                        backgroundColor: '#ef4444',
                        borderColor: '#dc2626',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '£' + value.toFixed(2);
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': £' + context.parsed.y.toFixed(2);
                                }
                            }
                        }
                    }
                }
            });

            this.updateChart();
            console.log('Chart initialized successfully');
        } catch (error) {
            console.error('Error initializing chart:', error);
        }
    }

    updateChart() {
        console.log('Updating chart...');
        if (!this.chart) {
            console.log('Chart not initialized, skipping update');
            return;
        }

        try {
            // Get current month data
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            // Calculate income and expenses for current month
            const monthlyIncome = this.transactions
                .filter(t => t.type === 'income' && 
                    new Date(t.date).getMonth() === currentMonth && 
                    new Date(t.date).getFullYear() === currentYear)
                .reduce((sum, t) => sum + t.amount, 0);

            const monthlyExpenses = this.transactions
                .filter(t => t.type === 'expense' && 
                    new Date(t.date).getMonth() === currentMonth && 
                    new Date(t.date).getFullYear() === currentYear)
                .reduce((sum, t) => sum + t.amount, 0);

            // Update chart data
            this.chart.data.labels = ['Current Month'];
            this.chart.data.datasets[0].data = [monthlyIncome];
            this.chart.data.datasets[1].data = [monthlyExpenses];

            this.chart.update();
            console.log('Chart updated with data:', { monthlyIncome, monthlyExpenses });
        } catch (error) {
            console.error('Error updating chart:', error);
        }
    }

    // Bulk Operations Methods
    toggleSelectionMode(context) {
        console.log(`Toggling selection mode for context: ${context}`);
        
        this.selectionMode[context] = !this.selectionMode[context];
        console.log(`Selection mode for ${context} is now: ${this.selectionMode[context]}`);
        
        const bulkActions = document.getElementById(`${context}-bulk-actions`);
        const toggleBtn = document.getElementById(`toggle-${context}-selection`);
        
        if (!bulkActions) {
            console.error(`Bulk actions element not found: ${context}-bulk-actions`);
            return;
        }
        
        if (!toggleBtn) {
            console.error(`Toggle button not found: toggle-${context}-selection`);
            return;
        }
        
        if (this.selectionMode[context]) {
            bulkActions.style.display = 'block';
            toggleBtn.innerHTML = '<i class="fas fa-times"></i>';
            toggleBtn.title = 'Exit Selection Mode';
            console.log(`Enabled selection mode for ${context}`);
        } else {
            bulkActions.style.display = 'none';
            toggleBtn.innerHTML = '<i class="fas fa-check-square"></i>';
            toggleBtn.title = 'Select Multiple';
            this.clearSelection(context);
            console.log(`Disabled selection mode for ${context}`);
        }
        
        // Re-render transactions to show/hide checkboxes
        try {
            if (context === 'recent') {
                this.updateDashboard(); // This calls the recent transactions rendering
            } else {
                this.renderAllTransactions();
            }
            console.log(`Re-rendered transactions for ${context}`);
        } catch (error) {
            console.error(`Error re-rendering transactions for ${context}:`, error);
        }
    }

    selectAllTransactions(context) {
        console.log(`Selecting all transactions for context: ${context}`);
        
        const transactions = context === 'recent' 
            ? this.transactions.slice(0, 5) 
            : this.transactions;
            
        console.log(`Found ${transactions.length} transactions to select`);
            
        this.selectedTransactions[context].clear();
        transactions.forEach(t => {
            const id = String(t.id);
            this.selectedTransactions[context].add(id);
        });
        
        console.log(`Selected ${this.selectedTransactions[context].size} transactions`);
        this.updateSelectionDisplay(context);
        this.updateTransactionCheckboxes(context);
    }

    clearSelection(context) {
        this.selectedTransactions[context].clear();
        this.updateSelectionDisplay(context);
        this.updateTransactionCheckboxes(context);
    }

    toggleTransactionSelection(transactionId, context) {
        console.log(`Toggling selection for transaction ${transactionId} in context ${context}`);
        
        // Ensure transactionId is a string for consistent comparison
        const id = String(transactionId);
        
        if (this.selectedTransactions[context].has(id)) {
            this.selectedTransactions[context].delete(id);
            console.log(`Removed transaction ${id} from selection`);
        } else {
            this.selectedTransactions[context].add(id);
            console.log(`Added transaction ${id} to selection`);
        }
        
        console.log(`Selected transactions for ${context}:`, Array.from(this.selectedTransactions[context]));
        this.updateSelectionDisplay(context);
    }

    updateSelectionDisplay(context) {
        const count = this.selectedTransactions[context].size;
        document.getElementById(`${context}-selection-count`).textContent = `${count} selected`;
    }

    updateTransactionCheckboxes(context) {
        const checkboxes = document.querySelectorAll(`.transaction-checkbox-${context}`);
        console.log(`Updating ${checkboxes.length} checkboxes for context ${context}`);
        
        checkboxes.forEach(checkbox => {
            const transactionId = String(checkbox.dataset.transactionId);
            const isSelected = this.selectedTransactions[context].has(transactionId);
            checkbox.checked = isSelected;
            
            const transactionItem = checkbox.closest('.transaction-item');
            if (transactionItem) {
                if (isSelected) {
                    transactionItem.classList.add('selected');
                } else {
                    transactionItem.classList.remove('selected');
                }
            }
        });
    }

    openBulkEditModal(context) {
        console.log(`Opening bulk edit modal for context: ${context}`);
        
        const selectedCount = this.selectedTransactions[context].size;
        console.log(`Selected count: ${selectedCount}`);
        
        if (selectedCount === 0) {
            this.showToast('Please select transactions to edit', 'error');
            return;
        }

        const bulkEditCount = document.getElementById('bulk-edit-count');
        if (bulkEditCount) {
            bulkEditCount.textContent = selectedCount;
        } else {
            console.error('bulk-edit-count element not found');
        }
        
        this.currentBulkEditContext = context;
        
        // Reset form
        const bulkEditForm = document.getElementById('bulk-edit-form');
        if (bulkEditForm) {
            bulkEditForm.reset();
            console.log('Bulk edit form reset');
        } else {
            console.error('bulk-edit-form not found');
        }
        
        const checkboxes = document.querySelectorAll('#bulk-edit-form input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = false;
            cb.dispatchEvent(new Event('change'));
        });
        console.log(`Reset ${checkboxes.length} checkboxes`);

        // Populate categories
        try {
            this.updateBulkEditCategories();
            console.log('Updated bulk edit categories');
        } catch (error) {
            console.error('Error updating bulk edit categories:', error);
        }
        
        this.openModal('bulk-edit-modal');
    }

    updateBulkEditCategories() {
        const categorySelect = document.getElementById('bulk-edit-category');
        const categories = [...new Set(this.transactions.map(t => t.category))].filter(Boolean).sort();
        
        categorySelect.innerHTML = '<option value="">Select Category</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }

    async applyBulkEdit() {
        const context = this.currentBulkEditContext;
        const selectedIds = Array.from(this.selectedTransactions[context]);
        
        if (selectedIds.length === 0) {
            this.showToast('No transactions selected', 'error');
            return;
        }

        const updates = {};
        
        if (document.getElementById('bulk-edit-type-checkbox').checked) {
            updates.type = document.getElementById('bulk-edit-type').value;
        }
        
        if (document.getElementById('bulk-edit-category-checkbox').checked) {
            updates.category = document.getElementById('bulk-edit-category').value;
        }
        
        if (document.getElementById('bulk-edit-date-checkbox').checked) {
            updates.date = document.getElementById('bulk-edit-date').value;
        }

        if (Object.keys(updates).length === 0) {
            this.showToast('Please select fields to update', 'error');
            return;
        }

        try {
            // Apply updates
            let updatedCount = 0;
            this.transactions.forEach(transaction => {
                if (selectedIds.includes(transaction.id)) {
                    Object.assign(transaction, updates);
                    updatedCount++;
                }
            });

            this.saveData();
            this.updateDashboard();
            this.renderTransactions();
            this.renderAllTransactions();
            this.updateChart();
            this.updateFilterCategories();
            
            this.closeModal('bulk-edit-modal');
            this.showToast(`${updatedCount} transactions updated successfully!`, 'success');
            
            // Clear selection
            this.clearSelection(context);
            
        } catch (error) {
            console.error('Error applying bulk edit:', error);
            this.showToast('Error updating transactions: ' + error.message, 'error');
        }
    }

    async bulkDeleteTransactions(context) {
        const selectedIds = Array.from(this.selectedTransactions[context]);
        
        if (selectedIds.length === 0) {
            this.showToast('Please select transactions to delete', 'error');
            return;
        }

        const confirmed = confirm(`Are you sure you want to delete ${selectedIds.length} transaction(s)? This action cannot be undone.`);
        if (!confirmed) return;

        try {
            let deletedCount = 0;
            
            // Delete transactions and their associated images efficiently
            for (const transactionId of selectedIds) {
                // Find the transaction
                const transactionIndex = this.transactions.findIndex(t => t.id === transactionId);
                if (transactionIndex === -1) continue;

                const transaction = this.transactions[transactionIndex];
                
                // Delete associated receipt and image if exists
                if (transaction.receiptId) {
                    const receiptIndex = this.receipts.findIndex(r => r.id === transaction.receiptId);
                    if (receiptIndex !== -1) {
                        const receipt = this.receipts[receiptIndex];
                        
                        // Delete image from IndexedDB if it exists
                        if (receipt.image && receipt.image.startsWith('indexeddb:')) {
                            await this.deleteImageFromDB(receipt.image);
                        }
                        
                        // Remove receipt
                        this.receipts.splice(receiptIndex, 1);
                    }
                }

                // Remove transaction
                this.transactions.splice(transactionIndex, 1);
                deletedCount++;
            }

            // Save data once after all deletions
            this.saveData();
            
            // Update all UI components once after bulk deletion
            this.updateDashboard();
            this.renderTransactions();
            this.renderAllTransactions();
            this.renderReceipts();
            this.updateChart();
            this.updateFilterCategories();
            this.updateAllTransactionsStats();

            this.showToast(`${deletedCount} transactions deleted successfully!`, 'success');
            
            // Clear selection and exit selection mode
            this.clearSelection(context);
            this.toggleSelectionMode(context);
            
        } catch (error) {
            console.error('Error deleting transactions:', error);
            this.showToast('Error deleting transactions: ' + error.message, 'error');
        }
    }
}

// Make the instance globally accessible
let expenseTracker;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    if (expenseTracker) {
        console.log('App already initialized, skipping...');
        return;
    }
    console.log('DOM loaded, initializing app...');
    expenseTracker = new ExpenseTracker();
});
