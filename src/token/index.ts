import { query, update, Principal, IDL } from 'azle';

// Struktur data untuk akun token
type Account = {
    owner: string;   // Principal disimpan sebagai string
    balance: bigint;  // Saldo token pengguna, gunakan bigint sebagai pengganti nat64
};

// Struktur data untuk allowance
type Allowance = {
    owner: string;   // Principal disimpan sebagai string
    spender: string; // Principal disimpan sebagai string
    amount: bigint;   // Jumlah token yang diizinkan untuk digunakan oleh spender
};

// Data global untuk menyimpan akun dan allowance
let accounts: Account[] = [];
let allowances: Allowance[] = [];

// Canister class definition
export default class Token {
    
    // Fungsi untuk mint token baru ke akun pengguna
    @update([IDL.Principal, IDL.Nat64], IDL.Bool)
    mint(owner: Principal, amount: bigint): boolean {
        const ownerStr = owner.toText();  // Mengonversi Principal ke string
        const account = accounts.find(acc => acc.owner === ownerStr);
        if (account) {
            account.balance += amount;  // Jika akun sudah ada, tambahkan saldo
        } else {
            accounts.push({ owner: ownerStr, balance: amount });  // Jika akun belum ada, buat akun baru
        }
        return true;
    }

    // Fungsi untuk mentransfer token antar pengguna
    @update([IDL.Principal, IDL.Principal, IDL.Nat64], IDL.Bool)
    transfer(from: Principal, to: Principal, amount: bigint): boolean {
        const fromStr = from.toText();  // Principal pengirim
        const toStr = to.toText();      // Principal penerima

        const sender = accounts.find(acc => acc.owner === fromStr);  // Akun pengirim
        const recipient = accounts.find(acc => acc.owner === toStr);  // Akun penerima

        if (!sender || sender.balance < amount) {
            return false;  // Jika pengirim tidak memiliki cukup saldo, transfer gagal
        }

        sender.balance -= amount;  // Kurangi saldo pengirim
        if (recipient) {
            recipient.balance += amount;  // Tambahkan saldo penerima
        } else {
            accounts.push({ owner: toStr, balance: amount });  // Buat akun baru jika penerima belum ada
        }

        return true;
    }

    // Fungsi untuk mengecek saldo token pengguna
    @query([IDL.Principal], IDL.Nat64)
    balanceOf(owner: Principal): bigint {
        const ownerStr = owner.toText();
        const account = accounts.find(acc => acc.owner === ownerStr);
        return account ? account.balance : 0n;  // Kembalikan saldo, atau 0 jika akun belum ada
    }

    // Fungsi untuk menyetel allowance (izin) bagi pengguna lain untuk menghabiskan token
    @update([IDL.Principal, IDL.Nat64], IDL.Bool)
    approve(spender: Principal, amount: bigint, caller: Principal): boolean {
        const owner = caller.toText();  // Principal dari pengguna yang menyetujui allowance
        const spenderStr = spender.toText();  // Principal penerima allowance
        const existingAllowance = allowances.find(allow => allow.owner === owner && allow.spender === spenderStr);

        if (existingAllowance) {
            existingAllowance.amount = amount;  // Jika allowance sudah ada, perbarui jumlahnya
        } else {
            allowances.push({ owner, spender: spenderStr, amount });  // Jika belum ada, buat allowance baru
        }
        return true;
    }

    // Fungsi untuk mengecek allowance
    @query([IDL.Principal, IDL.Principal], IDL.Nat64)
    allowance(owner: Principal, spender: Principal): bigint {
        const ownerStr = owner.toText();
        const spenderStr = spender.toText();
        const allow = allowances.find(allow => allow.owner === ownerStr && allow.spender === spenderStr);
        return allow ? allow.amount : 0n;
    }

    // Fungsi untuk mentransfer token berdasarkan allowance
    @update([IDL.Principal, IDL.Principal, IDL.Nat64], IDL.Bool)
    transferFrom(owner: Principal, spender: Principal, amount: bigint): boolean {
        const ownerStr = owner.toText();
        const spenderStr = spender.toText();

        const allowanceRecord = allowances.find(allow => allow.owner === ownerStr && allow.spender === spenderStr);
        const senderAccount = accounts.find(acc => acc.owner === ownerStr);
        const recipientAccount = accounts.find(acc => acc.owner === spenderStr);

        if (!allowanceRecord || allowanceRecord.amount < amount || !senderAccount || senderAccount.balance < amount) {
            return false;  // Jika allowance atau saldo tidak mencukupi, transfer gagal
        }

        // Transfer token
        senderAccount.balance -= amount;
        if (recipientAccount) {
            recipientAccount.balance += amount;
        } else {
            accounts.push({ owner: spenderStr, balance: amount });
        }

        // Kurangi allowance
        allowanceRecord.amount -= amount;
        return true;
    }
}
