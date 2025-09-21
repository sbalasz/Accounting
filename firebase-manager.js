// Firebase Data Manager for Business Tracker
import { db, encryptionManager } from './firebase-config.js';
import { 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    getDocs,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore';

class FirebaseDataManager {
    constructor(userId) {
        this.userId = userId;
        this.isOnline = navigator.onLine;
        this.setupOfflineHandling();
    }

    setupOfflineHandling() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    async syncOfflineData() {
        // Sync any offline changes when coming back online
        const offlineData = JSON.parse(localStorage.getItem('offline_changes') || '[]');
        
        for (const change of offlineData) {
            try {
                await this.applyChange(change);
            } catch (error) {
                console.error('Error syncing offline change:', error);
            }
        }
        
        // Clear offline changes after successful sync
        localStorage.removeItem('offline_changes');
    }

    async applyChange(change) {
        switch (change.type) {
            case 'add_transaction':
                await this.addTransaction(change.data);
                break;
            case 'update_transaction':
                await this.updateTransaction(change.id, change.data);
                break;
            case 'delete_transaction':
                await this.deleteTransaction(change.id);
                break;
            case 'add_receipt':
                await this.addReceipt(change.data);
                break;
            case 'update_receipt':
                await this.updateReceipt(change.id, change.data);
                break;
            case 'delete_receipt':
                await this.deleteReceipt(change.id);
                break;
        }
    }

    async storeOfflineChange(type, data, id = null) {
        const offlineChanges = JSON.parse(localStorage.getItem('offline_changes') || '[]');
        offlineChanges.push({ type, data, id, timestamp: Date.now() });
        localStorage.setItem('offline_changes', JSON.stringify(offlineChanges));
    }

    // Transaction Methods
    async addTransaction(transaction) {
        try {
            const encryptedData = await encryptionManager.encrypt(transaction);
            
            if (this.isOnline) {
                await addDoc(collection(db, 'users', this.userId, 'transactions'), {
                    data: encryptedData,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            } else {
                await this.storeOfflineChange('add_transaction', transaction);
            }
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
    }

    async updateTransaction(transactionId, transaction) {
        try {
            const encryptedData = await encryptionManager.encrypt(transaction);
            
            if (this.isOnline) {
                await updateDoc(doc(db, 'users', this.userId, 'transactions', transactionId), {
                    data: encryptedData,
                    updatedAt: serverTimestamp()
                });
            } else {
                await this.storeOfflineChange('update_transaction', transaction, transactionId);
            }
        } catch (error) {
            console.error('Error updating transaction:', error);
            throw error;
        }
    }

    async deleteTransaction(transactionId) {
        try {
            if (this.isOnline) {
                await deleteDoc(doc(db, 'users', this.userId, 'transactions', transactionId));
            } else {
                await this.storeOfflineChange('delete_transaction', null, transactionId);
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
            throw error;
        }
    }

    async getTransactions() {
        try {
            if (this.isOnline) {
                const transactionsSnapshot = await getDocs(
                    collection(db, 'users', this.userId, 'transactions')
                );
                
                const transactions = [];
                transactionsSnapshot.forEach(doc => {
                    const data = doc.data();
                    const decryptedData = encryptionManager.decrypt(data.data);
                    transactions.push({
                        id: doc.id,
                        ...decryptedData
                    });
                });
                
                return transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            } else {
                // Return cached data when offline
                return JSON.parse(localStorage.getItem(`transactions_${this.userId}`) || '[]');
            }
        } catch (error) {
            console.error('Error getting transactions:', error);
            return [];
        }
    }

    // Receipt Methods
    async addReceipt(receipt) {
        try {
            const encryptedData = await encryptionManager.encrypt(receipt);
            
            if (this.isOnline) {
                await addDoc(collection(db, 'users', this.userId, 'receipts'), {
                    data: encryptedData,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            } else {
                await this.storeOfflineChange('add_receipt', receipt);
            }
        } catch (error) {
            console.error('Error adding receipt:', error);
            throw error;
        }
    }

    async updateReceipt(receiptId, receipt) {
        try {
            const encryptedData = await encryptionManager.encrypt(receipt);
            
            if (this.isOnline) {
                await updateDoc(doc(db, 'users', this.userId, 'receipts', receiptId), {
                    data: encryptedData,
                    updatedAt: serverTimestamp()
                });
            } else {
                await this.storeOfflineChange('update_receipt', receipt, receiptId);
            }
        } catch (error) {
            console.error('Error updating receipt:', error);
            throw error;
        }
    }

    async deleteReceipt(receiptId) {
        try {
            if (this.isOnline) {
                await deleteDoc(doc(db, 'users', this.userId, 'receipts', receiptId));
            } else {
                await this.storeOfflineChange('delete_receipt', null, receiptId);
            }
        } catch (error) {
            console.error('Error deleting receipt:', error);
            throw error;
        }
    }

    async getReceipts() {
        try {
            if (this.isOnline) {
                const receiptsSnapshot = await getDocs(
                    collection(db, 'users', this.userId, 'receipts')
                );
                
                const receipts = [];
                receiptsSnapshot.forEach(doc => {
                    const data = doc.data();
                    const decryptedData = encryptionManager.decrypt(data.data);
                    receipts.push({
                        id: doc.id,
                        ...decryptedData
                    });
                });
                
                return receipts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            } else {
                // Return cached data when offline
                return JSON.parse(localStorage.getItem(`receipts_${this.userId}`) || '[]');
            }
        } catch (error) {
            console.error('Error getting receipts:', error);
            return [];
        }
    }

    // Real-time sync setup
    setupRealtimeSync(onDataChange) {
        if (!this.isOnline) return;

        // Listen for transaction changes
        const transactionsRef = collection(db, 'users', this.userId, 'transactions');
        onSnapshot(transactionsRef, async (snapshot) => {
            const transactions = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                const decryptedData = encryptionManager.decrypt(data.data);
                transactions.push({
                    id: doc.id,
                    ...decryptedData
                });
            });
            
            onDataChange('transactions', transactions);
        });

        // Listen for receipt changes
        const receiptsRef = collection(db, 'users', this.userId, 'receipts');
        onSnapshot(receiptsRef, async (snapshot) => {
            const receipts = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                const decryptedData = encryptionManager.decrypt(data.data);
                receipts.push({
                    id: doc.id,
                    ...decryptedData
                });
            });
            
            onDataChange('receipts', receipts);
        });
    }

    // Data sharing methods
    async shareData(shareData) {
        try {
            const encryptedData = await encryptionManager.encrypt(shareData.data);
            
            await addDoc(collection(db, 'shares'), {
                fromUserId: this.userId,
                toEmail: shareData.toEmail,
                shareType: shareData.shareType,
                data: encryptedData,
                createdAt: serverTimestamp(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            });
            
            return true;
        } catch (error) {
            console.error('Error sharing data:', error);
            throw error;
        }
    }

    async getSharedData() {
        try {
            const sharesSnapshot = await getDocs(
                query(collection(db, 'shares'), where('toEmail', '==', this.currentUser.email))
            );
            
            const sharedData = [];
            sharesSnapshot.forEach(doc => {
                const data = doc.data();
                const decryptedData = encryptionManager.decrypt(data.data);
                sharedData.push({
                    id: doc.id,
                    fromUserId: data.fromUserId,
                    shareType: data.shareType,
                    data: decryptedData,
                    createdAt: data.createdAt
                });
            });
            
            return sharedData;
        } catch (error) {
            console.error('Error getting shared data:', error);
            return [];
        }
    }

    // Migration from localStorage to Firebase
    async migrateFromLocalStorage() {
        try {
            const localTransactions = JSON.parse(localStorage.getItem(`transactions_${this.userId}`) || '[]');
            const localReceipts = JSON.parse(localStorage.getItem(`receipts_${this.userId}`) || '[]');

            // Migrate transactions
            for (const transaction of localTransactions) {
                await this.addTransaction(transaction);
            }

            // Migrate receipts
            for (const receipt of localReceipts) {
                await this.addReceipt(receipt);
            }

            // Clear local data after successful migration
            localStorage.removeItem(`transactions_${this.userId}`);
            localStorage.removeItem(`receipts_${this.userId}`);

            return true;
        } catch (error) {
            console.error('Error migrating data:', error);
            return false;
        }
    }
}

export default FirebaseDataManager;
