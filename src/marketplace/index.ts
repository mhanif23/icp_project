import { query, update, Principal, IDL } from 'azle';

// Struktur data untuk NFT
type NFT = {
    id: string;
    owner: string;  // Principal disimpan sebagai string
    metadata: string;
    isForSale: boolean;
};

// Struktur data untuk sewa
type Rental = {
    nftId: string;
    renter: string;  // Principal disimpan sebagai string
    expiresAt: bigint;  // Waktu berakhirnya sewa dalam nanodetik
};

// Struktur data untuk membership
type Membership = {
    owner: string;  // Principal disimpan sebagai string
    expiresAt: bigint;  // Waktu berakhirnya membership
};

// Data global untuk menyimpan NFT, rental, dan membership
let nfts: NFT[] = [];
let rentals: Rental[] = [];
let memberships: Membership[] = [];

// Canister class definition
export default class Marketplace {

    // Fungsi untuk mint NFT
    @update([IDL.Text], IDL.Text)
    mintNFT(metadata: string, caller: Principal): string {
        const owner = caller.toText();  // Principal diubah menjadi string
        const nftId = (Math.random() * 1000000).toString();  // ID unik sederhana untuk NFT
        const newNFT: NFT = {
            id: nftId,
            owner,
            metadata,
            isForSale: true  // Secara default, NFT baru untuk dijual
        };
        nfts.push(newNFT);  // Menambahkan NFT baru ke daftar NFT
        return nftId;  // Mengembalikan ID NFT yang baru dibuat
    }

    // Fungsi untuk mendapatkan daftar semua NFT di marketplace
    @query([], IDL.Vec(IDL.Record({
        id: IDL.Text,
        owner: IDL.Text,
        metadata: IDL.Text,
        isForSale: IDL.Bool
    })))
    listNFTs(): NFT[] {
        return nfts;
    }

    // Fungsi untuk membeli dan mentransfer kepemilikan NFT
    @update([IDL.Text, IDL.Principal], IDL.Bool)
    transferNFT(nftId: string, newOwner: Principal, caller: Principal): boolean {
        const nft = nfts.find(n => n.id === nftId);  // Cari NFT berdasarkan ID
        if (nft && nft.owner === caller.toText()) {  // Pastikan pemanggil adalah pemilik saat ini
            nft.owner = newOwner.toText();  // Pindahkan kepemilikan ke pembeli baru
            nft.isForSale = false;  // Hentikan penjualan setelah pembelian
            return true;
        }
        return false;
    }

    // Fungsi untuk menyewa NFT
    @update([IDL.Text, IDL.Nat64], IDL.Bool)
    rentNFT(nftId: string, duration: bigint, caller: Principal): boolean {
        const callerStr = caller.toText();  // Principal diubah menjadi string
        const nft = nfts.find(n => n.id === nftId);  // Cari NFT berdasarkan ID
        if (!nft || nft.owner === callerStr) {  // NFT tidak ditemukan atau penyewa adalah pemilik
            return false;
        }

        // Tambahkan transaksi sewa
        const newRental: Rental = {
            nftId,
            renter: callerStr,
            expiresAt: this.getCurrentTime() + duration  // Tentukan waktu berakhir sewa
        };
        rentals.push(newRental);  // Simpan transaksi sewa
        return true;
    }

    // Memeriksa apakah NFT sedang disewa
    @query([IDL.Text], IDL.Bool)
    isNFTRented(nftId: string): boolean {
        const rental = rentals.find(r => r.nftId === nftId && r.expiresAt > this.getCurrentTime());
        return !!rental;  // Mengembalikan true jika NFT sedang disewa
    }

    // Fungsi untuk membeli membership
    @update([IDL.Nat64], IDL.Bool)
    buyMembership(duration: bigint, caller: Principal): boolean {
        const callerStr = caller.toText();  // Principal diubah menjadi string
        memberships.push({
            owner: callerStr,
            expiresAt: this.getCurrentTime() + duration  // Tentukan waktu berakhir membership
        });
        return true;
    }

    // Memeriksa apakah pengguna memiliki membership yang aktif
    @query([], IDL.Bool)
    isMembershipActive(caller: Principal): boolean {
        const callerStr = caller.toText();
        const membership = memberships.find(m => m.owner === callerStr && m.expiresAt > this.getCurrentTime());
        return !!membership;  // Mengembalikan true jika membership masih aktif
    }

    // Fungsi untuk mendapatkan waktu saat ini (dummy implementation)
    getCurrentTime(): bigint {
        return BigInt(Date.now()) * BigInt(1000000);  // Konversi ke nanodetik
    }
}
