import { query, update, Principal, IDL } from 'azle';

// Struktur data untuk menyimpan informasi pengguna
type User = {
    principal: string;  // Principal ID pengguna disimpan sebagai string
    username: string;   // Username yang dipilih pengguna saat registrasi
};

// Daftar pengguna yang terdaftar di sistem
let users: User[] = [];

// Canister class definition
export default class Auth {

    // Fungsi untuk mendaftarkan pengguna baru ke sistem
    @update([IDL.Text, IDL.Principal], IDL.Bool)
    register(username: string, caller: Principal): boolean {
        const callerStr = caller.toText();  // Principal diubah menjadi string

        // Periksa apakah pengguna sudah terdaftar
        const existingUser = users.find(user => user.principal === callerStr);
        if (existingUser) {
            return false;  // Jika pengguna sudah terdaftar, gagal registrasi
        }

        // Tambahkan pengguna baru ke daftar
        users.push({
            principal: callerStr,
            username
        });
        return true;  // Sukses registrasi
    }

    // Fungsi untuk mengecek apakah pengguna sudah terdaftar
    @query([IDL.Principal], IDL.Bool)
    isUserRegistered(caller: Principal): boolean {
        const callerStr = caller.toText();
        const user = users.find(user => user.principal === callerStr);
        return !!user;  // Mengembalikan true jika pengguna sudah terdaftar
    }

    // Fungsi untuk mendapatkan informasi pengguna yang terdaftar
    @query([IDL.Principal], IDL.Opt(IDL.Record({
        principal: IDL.Text,
        username: IDL.Text
    })))
    getUserInfo(caller: Principal): [] | [{ principal: string; username: string }] {
        const callerStr = caller.toText();
        const user = users.find(user => user.principal === callerStr);
        
        // Mengembalikan user sebagai array untuk menghindari masalah pengembalian tipe Opt
        return user ? [{ principal: user.principal, username: user.username }] : [];
    }

    // Fungsi untuk menghapus pengguna dari sistem
    @update([IDL.Principal], IDL.Bool)
    deleteUser(caller: Principal): boolean {
        const callerStr = caller.toText();
        const userIndex = users.findIndex(user => user.principal === callerStr);

        if (userIndex !== -1) {
            users.splice(userIndex, 1);  // Hapus pengguna dari daftar
            return true;
        }
        return false;
    }
}
