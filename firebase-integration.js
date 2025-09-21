// Firebase Integration for Business Tracker
// This file provides Firebase functionality for the main app

// Make FirebaseIntegration globally available
window.FirebaseIntegration = class FirebaseIntegration {
    constructor() {
        this.auth = null;
        this.db = null;
        this.encryptionManager = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Import Firebase modules
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            // Firebase configuration
            const firebaseConfig = {
                apiKey: "AIzaSyB36Qd7FG3ztdOvnqBiix1kF_gN6JJSdjA",
                authDomain: "business-tracker-app-33c3d.firebaseapp.com",
                projectId: "business-tracker-app-33c3d",
                storageBucket: "business-tracker-app-33c3d.firebasestorage.app",
                messagingSenderId: "965528133229",
                appId: "1:965528133229:web:92d0ab17808e5ec11da964"
            };

            // Initialize Firebase
            const app = initializeApp(firebaseConfig);
            this.auth = getAuth(app);
            this.db = getFirestore(app);
            
            // Initialize encryption manager
            this.encryptionManager = new EncryptionManager();
            
            this.isInitialized = true;
            console.log('Firebase initialized successfully');
            
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            throw error;
        }
    }

    async signInWithEmailAndPassword(email, password) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            
            // Initialize encryption with user's password
            await this.encryptionManager.generateKey(password, userCredential.user.uid);
            
            return userCredential.user;
        } catch (error) {
            console.error('Sign in failed:', error);
            throw error;
        }
    }

    async createUserWithEmailAndPassword(email, password, name) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const { createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            
            // Initialize encryption with user's password
            await this.encryptionManager.generateKey(password, userCredential.user.uid);
            
            // Create user profile in Firestore
            await setDoc(doc(this.db, 'users', userCredential.user.uid), {
                name: name,
                email: email,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            });
            
            return userCredential.user;
        } catch (error) {
            console.error('User creation failed:', error);
            throw error;
        }
    }

    async addTransaction(userId, transaction) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const encryptedData = await this.encryptionManager.encrypt(transaction);
            
            await addDoc(collection(this.db, 'users', userId, 'transactions'), {
                data: encryptedData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            
            return true;
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
    }

    async getTransactions(userId) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const transactionsSnapshot = await getDocs(collection(this.db, 'users', userId, 'transactions'));
            
            const transactions = [];
            transactionsSnapshot.forEach(doc => {
                const data = doc.data();
                const decryptedData = this.encryptionManager.decrypt(data.data);
                transactions.push({
                    id: doc.id,
                    ...decryptedData
                });
            });
            
            return transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            console.error('Error getting transactions:', error);
            return [];
        }
    }

    async addReceipt(userId, receipt) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const encryptedData = await this.encryptionManager.encrypt(receipt);
            
            await addDoc(collection(this.db, 'users', userId, 'receipts'), {
                data: encryptedData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            
            return true;
        } catch (error) {
            console.error('Error adding receipt:', error);
            throw error;
        }
    }

    async getReceipts(userId) {
        if (!this.isInitialized) {
            await this.isInitialized) {
            await this.initialize();
        }

        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const receiptsSnapshot = await getDocs(collection(this.db, 'users', userId, 'receipts'));
            
            const receipts = [];
            receiptsSnapshot.forEach(doc => {
                const data = doc.data();
                const decryptedData = this.encryptionManager.decrypt(data.data);
                receipts.push({
                    id: doc.id,
                    ...decryptedData
                });
            });
            
            return receipts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            console.error('Error getting receipts:', error);
            return [];
        }
    }

    async updateTransaction(userId, transactionId, transaction) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const encryptedData = await this.encryptionManager.encrypt(transaction);
            
            await updateDoc(doc(this.db, 'users', userId, 'transactions', transactionId), {
                data: encryptedData,
                updatedAt: serverTimestamp()
            });
            
            return true;
        } catch (error) {
            console.error('Error updating transaction:', error);
            throw error;
        }
    }

    async deleteTransaction(userId, transactionId) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            await deleteDoc(doc(this.db, 'users', userId, 'transactions', transactionId));
            return true;
        } catch (error) {
            console.error('Error deleting transaction:', error);
            throw error;
        }
    }

    async updateReceipt(userId, receiptId, receipt) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            const encryptedData = await this.encryptionManager.encrypt(receipt);
            
            await updateDoc(doc(this.db, 'users', userId, 'receipts', receiptId), {
                data: encryptedData,
                updatedAt: serverTimestamp()
            });
            
            return true;
        } catch (error) {
            console.error('Error updating receipt:', error);
            throw error;
        }
    }

    async deleteReceipt(userId, receiptId) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        try {
            await deleteDoc(doc(this.db, 'users', userId, 'receipts', receiptId));
            return true;
        } catch (error) {
            console.error('Error deleting receipt:', error);
            throw error;
        }
    }

    async migrateFromLocalStorage(userId) {
        try {
            const localTransactions = JSON.parse(localStorage.getItem(`transactions_${userId}`) || '[]');
            const localReceipts = JSON.parse(localStorage.getItem(`receipts_${userId}`) || '[]');

            // Migrate transactions
            for (const transaction of localTransactions) {
                await this.addTransaction(userId, transaction);
            }

            // Migrate receipts
            for (const receipt of localReceipts) {
                await this.addReceipt(userId, receipt);
            }

            // Clear local data after successful migration
            localStorage.removeItem(`transactions_${userId}`);
            localStorage.removeItem(`receipts_${userId}`);

            return true;
        } catch (error) {
            console.error('Error migrating data:', error);
            return false;
        }
    }

    // Real-time sync methods
    setupRealtimeSync(userId, onDataChange) {
        if (!this.isInitialized) {
            console.error('Firebase not initialized for real-time sync');
            return;
        }

        // Import onSnapshot for real-time updates
        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js').then(({ collection, onSnapshot }) => {
            // Listen for transaction changes
            const transactionsRef = collection(this.db, 'users', userId, 'transactions');
            onSnapshot(transactionsRef, async (snapshot) => {
                const transactions = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    try {
                        const decryptedData = await this.encryptionManager.decrypt(data.data);
                        transactions.push({
                            id: doc.id,
                            ...decryptedData
                        });
                    } catch (error) {
                        console.error('Error decrypting transaction:', error);
                    }
                });
                
                onDataChange('transactions', transactions);
            });

            // Listen for receipt changes
            const receiptsRef = collection(this.db, 'users', userId, 'receipts');
            onSnapshot(receiptsRef, async (snapshot) => {
                const receipts = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    try {
                        const decryptedData = await this.encryptionManager.decrypt(data.data);
                        receipts.push({
                            id: doc.id,
                            ...decryptedData
                        });
                    } catch (error) {
                        console.error('Error decrypting receipt:', error);
                    }
                });
                
                onDataChange('receipts', receipts);
            });
        }).catch(error => {
            console.error('Error setting up real-time sync:', error);
        });
    }
};

// Make EncryptionManager globally available too
window.EncryptionManager = class EncryptionManager {
    constructor() {
        this.encryptionKey = null;
    }

    async generateKey(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: encoder.encode(salt),
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );

        this.encryptionKey = key;
        return key;
    }

    async encrypt(data) {
        if (!this.encryptionKey) {
            throw new Error('Encryption key not initialized');
        }

        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(JSON.stringify(data));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        const encryptedData = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            this.encryptionKey,
            dataBuffer
        );

        return {
            data: Array.from(new Uint8Array(encryptedData)),
            iv: Array.from(iv)
        };
    }

    async decrypt(encryptedData) {
        if (!this.encryptionKey) {
            throw new Error('Encryption key not initialized');
        }

        const dataBuffer = new Uint8Array(encryptedData.data);
        const iv = new Uint8Array(encryptedData.iv);

        const decryptedData = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            this.encryptionKey,
            dataBuffer
        );

        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decryptedData));
    }
};