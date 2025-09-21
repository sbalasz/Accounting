// Simple Firebase Integration for Business Tracker
// This version uses CDN imports and works with regular HTML

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
let app, auth, db;

// Simple Firebase Integration Class
window.FirebaseIntegration = class FirebaseIntegration {
    constructor() {
        this.auth = null;
        this.db = null;
        this.encryptionManager = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Load Firebase SDKs
            await this.loadFirebaseSDKs();
            
            // Initialize Firebase
            app = firebase.initializeApp(firebaseConfig);
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            // Initialize encryption manager
            this.encryptionManager = new EncryptionManager();
            
            this.isInitialized = true;
            console.log('Firebase initialized successfully');
            
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            throw error;
        }
    }

    async loadFirebaseSDKs() {
        return new Promise((resolve, reject) => {
            // Check if Firebase is already loaded
            if (typeof firebase !== 'undefined') {
                resolve();
                return;
            }

            // Load Firebase SDKs (compat builds for global firebase namespace)
            const script1 = document.createElement('script');
            script1.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
            script1.onload = () => {
                const script2 = document.createElement('script');
                script2.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js';
                script2.onload = () => {
                    const script3 = document.createElement('script');
                    script3.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js';
                    script3.onload = () => {
                        resolve();
                    };
                    script3.onerror = () => reject(new Error('Failed to load Firestore'));
                    document.head.appendChild(script3);
                };
                script2.onerror = () => reject(new Error('Failed to load Auth'));
                document.head.appendChild(script2);
            };
            script1.onerror = () => reject(new Error('Failed to load Firebase App'));
            document.head.appendChild(script1);
        });
    }

    async signInWithEmailAndPassword(email, password) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            
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

        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            
            // Initialize encryption with user's password
            await this.encryptionManager.generateKey(password, userCredential.user.uid);
            
            // Create user profile in Firestore
            await this.db.collection('users').doc(userCredential.user.uid).set({
                name: name,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return userCredential.user;
        } catch (error) {
            console.error('User creation failed:', error);
            throw error;
        }
    }

    async addTransaction(userId, transaction) {
        console.log('Firebase addTransaction called:', { userId, transaction });
        
        if (!this.isInitialized) {
            console.log('Firebase not initialized, initializing now...');
            await this.initialize();
        }

        try {
            const hasKey = !!this.encryptionManager.encryptionKey;
            console.log('Encryption key available:', hasKey);
            
            const payload = hasKey
                ? { data: await this.encryptionManager.encrypt(transaction) }
                : { plain: true, value: transaction };
            
            console.log('Saving to Firestore with payload:', { ...payload, userId });
            
            const docRef = await this.db.collection('users').doc(userId).collection('transactions').add({
                ...payload,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('Transaction saved to Firestore with ID:', docRef.id);
            return true;
        } catch (error) {
            console.error('Error adding transaction to Firestore:', error);
            throw error;
        }
    }

    async getTransactions(userId) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const snapshot = await this.db.collection('users').doc(userId).collection('transactions').get();
            
            const transactions = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                try {
                    if (data.plain && data.value) {
                        transactions.push({ id: doc.id, ...data.value });
                    } else if (data.data) {
                        const decryptedData = this.encryptionManager.decrypt(data.data);
                        transactions.push({ id: doc.id, ...decryptedData });
                    }
                } catch (decryptError) {
                    console.error('Error reading transaction:', decryptError);
                }
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

        try {
            const hasKey = !!this.encryptionManager.encryptionKey;
            const payload = hasKey
                ? { data: await this.encryptionManager.encrypt(receipt) }
                : { plain: true, value: receipt };
            
            await this.db.collection('users').doc(userId).collection('receipts').add({
                ...payload,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return true;
        } catch (error) {
            console.error('Error adding receipt:', error);
            throw error;
        }
    }

    async getReceipts(userId) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const snapshot = await this.db.collection('users').doc(userId).collection('receipts').get();
            
            const receipts = [];
            snapshot.forEach(doc => {
            const data = doc.data();
            try {
                if (data.plain && data.value) {
                    receipts.push({ id: doc.id, ...data.value });
                } else if (data.data) {
                    const decryptedData = this.encryptionManager.decrypt(data.data);
                    receipts.push({ id: doc.id, ...decryptedData });
                }
            } catch (decryptError) {
                console.error('Error reading receipt:', decryptError);
            }
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

        try {
            const encryptedData = await this.encryptionManager.encrypt(transaction);
            
            await this.db.collection('users').doc(userId).collection('transactions').doc(transactionId).update({
                data: encryptedData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
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

        try {
            await this.db.collection('users').doc(userId).collection('transactions').doc(transactionId).delete();
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

        try {
            const encryptedData = await this.encryptionManager.encrypt(receipt);
            
            await this.db.collection('users').doc(userId).collection('receipts').doc(receiptId).update({
                data: encryptedData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
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

        try {
            await this.db.collection('users').doc(userId).collection('receipts').doc(receiptId).delete();
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

        // Listen for transaction changes
        this.db.collection('users').doc(userId).collection('transactions')
            .onSnapshot(async (snapshot) => {
                const transactions = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    try {
                        if (data.plain && data.value) {
                            transactions.push({ id: doc.id, ...data.value });
                        } else if (data.data) {
                            const decryptedData = this.encryptionManager.decrypt(data.data);
                            transactions.push({ id: doc.id, ...decryptedData });
                        }
                    } catch (error) {
                        console.error('Error reading transaction in real-time sync:', error);
                    }
                });
                
                onDataChange('transactions', transactions);
            });

        // Listen for receipt changes
        this.db.collection('users').doc(userId).collection('receipts')
            .onSnapshot(async (snapshot) => {
                const receipts = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    try {
                        if (data.plain && data.value) {
                            receipts.push({ id: doc.id, ...data.value });
                        } else if (data.data) {
                            const decryptedData = this.encryptionManager.decrypt(data.data);
                            receipts.push({ id: doc.id, ...decryptedData });
                        }
                    } catch (error) {
                        console.error('Error reading receipt in real-time sync:', error);
                    }
                });
                
                onDataChange('receipts', receipts);
            });
    }
};

// Simple Encryption Manager
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

console.log('Firebase Simple Integration loaded successfully');
