```markdown
# ShapeSeed - Spy Wallet

> Draw your Bitcoin key. Remember it forever. Leave no trace.
```
i downloaded [Argon2id](https://cdn.jsdelivr.net/npm/argon2-browser@1.18.0/dist/argon2-bundled.min.js)

---
i had a huge reasoning to build that <br>
how the idea came from:

in the past 6 months, i went deep down the Bitcoin rabbit hole and i was learning as much as possible around it.
After that, i decided to build projects around Bitcoin in order to solidify my knowledge. i was using tools like [LearnMeABitcoin](https://learnmeabitcoin.com/)

thanks Greg i learned so much from that project 

[Private Keys](https://learnmeabitcoin.com/beginners/guide/private-keys/#pinned) where the idea was born
<img width="1204" height="845" alt="image" src="https://github.com/user-attachments/assets/6062477d-6c6b-4b92-89f8-e51ba6dade8b" />

While learning about private keys, i understood that it was simply 256 random bits, nothing special. Then i asked a question: why can't i build a website where i can simply draw shapes (because pattern recognition always beats just memorising words)?

From that, x shapes are used to XOR the bits and then hashed for a checksum in order to get 264 bits, split into 24 × 11-bit chunks, convert each chunk into decimal, and map it to the official BiP-39
 word list.

While learning about private keys, brain wallets, etc., i have never found something like shapeSeed (where users can just memorise sequences/patterns rather than seeds).

While building this, i came across the "Advanced" mode, where instead of just making XOR of 2 shapes, i added an extra layer of security simply from the PiN.

Using Argon2id(PiN + XOR bits + memory + iterations) is truly mind-blowing. First, i was simply using SHA-256(pass || bits), but it's weak here because brute forcing is quite fast - modern CPUs/GPUs can make billions of iterations in seconds.

Even someone with an RTX 4090 can't do much when brute forcing my password + shapes. Brute forcing time decreases significantly.

i downloaded official Argon2id alongside my HTML file. it produces a 256-bit output + 8-bit checksum -> splitting into 24 × 11-bit chunks -> then mapping to the words.

---

---

## What This is

ShapeSeed is a BiP39 wallet key generator where your private key comes from shapes you draw with your hand - not from randomness a machine invented for you.

You draw two personal patterns on a pixel grid. The app XORs them together, mixes in ten hidden noise bits, and converts the result to a standard 24-word Bitcoin mnemonic. Same drawings, same words. Always. Deterministic, offline, auditable in a single HTML file.

No device to buy. No server. No seed phrase handed to you by a stranger's algorithm. You are the seed.

---

## The Problem With How Everyone Else Does it

The standard Bitcoin backup is 24 random words written on steel, hidden in your house. This works until it doesn't. A burglar finds it. A border agent sees it. A family member recognizes what it is. The words are self-explanatory. There is no deniability. Discovery equals total loss, instantly.

Brain wallets tried to fix this by letting you derive a key from a passphrase. They failed because human-chosen phrases are not random - people use song lyrics, birthdays, movie quotes. Attackers have wordlists for all of it. Dictionary attacks crack them in seconds.

ShapeSeed takes a different path. it exploits something genuinely underused in cryptography: **human spatial memory is extraordinarily durable and personal.** You remember the floor plan of your childhood home decades later. You remember logos, faces, routes. You forget word 14 of 24 by Tuesday.

---

## How it Works

### The Grid

A 32×8 or 16x16 canvas. 256 cells. Each cell is one bit.

### Layer A - Your First Shape

Draw something personal. Your initial in block letters. Your dog's silhouette. The outline of a country. Something only you would draw, in the way only you would draw it. This becomes 256 bits directly, no randomness algorithm involved.

### Layer B - Your Second Shape

Draw a complementary shape, occupying different zones than A. Where A lives on the left, B lives on the right. The two shapes are merged using XOR: a bit is 1 in the result only if exactly one of the two inputs is 1. A and B alone are meaningless. Their merge is the key.

### Noise - The Hidden Layer

Ten bits placed near the corners of the grid, memorized as relative compass positions: *"two right, one down from top-left."* A camera pointed at your hands while you draw would never capture these. They exist only in your memory. They are your invisible second factor.

### Derivation

```
merged = Layer_A XOR Layer_B XOR Noise     -> 256 bits
checksum = SHA256(merged)[0:8]             -> 8 bits
all_bits = merged ∥ checksum              -> 264 bits
words = chunk(all_bits, 11) -> BiP39 index -> 24 words
```

Standard BiP39, fully compatible with every major wallet.

---

## Advanced Mode - Argon2id Hardening

in advanced mode you add a PiN. it never gets stored anywhere. What happens:

```
entropy = Argon2id(
  password = your_PiN,
  salt     = XOR_bitmap_bytes,
  memory   = 64 MB,
  iterations = 3
) -> 256 bits -> BiP39
```

**Why Argon2id specifically.** Argon2id is the winner of the Password Hashing Competition and the current OWASP recommendation for password-based key derivation. it is memory-hard - deriving it requires 64MB of RAM per attempt. This makes GPU and ASiC brute-force attacks economically devastating. An attacker who somehow obtains your exact drawing still cannot enumerate PiNs at scale. Each attempt costs 64MB of memory and real time.

SHA-256 would let an attacker run billions of PiN guesses per second on a GPU farm. Argon2id limits that to thousands. The difference is the margin between "crackable in a weekend" and "computationally impractical."

Same PiN plus same drawing always produces the same 24 words. The two factors are independently useless - the shape without the PiN gives a completely different wallet, and the PiN without the shape gives nothing.


---

## Real Scenarios Where This Matters

**Border crossing.** Carry nothing. No hardware wallet to confiscate, no written phrase to find, no metadata on any device. Reconstruct your wallet on the other side on a fresh Tails session from pure memory - two shapes you've practiced drawing dozens of times.

**inheritance.** instead of leaving 24 words in a safe - which broadcasts "this is the crypto key" to anyone who opens it - leave a hand-drawn pattern in a notebook alongside a note that only makes sense to someone who already knows the system. The pattern without context is unrecognizable as a key.

**Authoritarian environments.** A journalist, activist, or person living under surveillance who cannot carry hardware and cannot have encrypted storage can reconstruct their wallet from pure memory anywhere with a browser and this file.

**Physical discovery threat.** if someone breaks into your home, finds your shape drawing on paper, they find what looks like a doodle. Without knowing it's a ShapeSeed wallet, without Layer B, without the noise positions, without the PiN - it is a doodle.

---

## Security Model - Honest Assessment

| Setup | Effective Security | Notes |
|---|---|---|
| Basic (shapes only) | ~80–140 bits estimated | Depends entirely on shape complexity and personal unpredictability |
| Basic + Noise | +positional secrecy | Noise bits invisible to cameras, adds deniability |
| Advanced (Argon2id + PiN) | 256 bits (hash output) | Memory-hard, GPU-resistant, PiN required alongside shape |
| Duress (Layer A decoy) | Plausible deniability | Real funded decoy wallet, unprovable withheld layers |

**What makes shapes secure is personal unpredictability, not complexity.** A simple shape that only you would draw in the way you draw it - asymmetric, emotionally personal, spatially unique - is not in any attacker's dictionary. A mathematically structured pattern (Fibonacci, primes) is. Classic sequences are enumerable in seconds. Do not use them.

**The XOR cancellation trap.** if Layer A and Layer B share bits in the same positions, those bits cancel to zero. Two identical shapes produce an empty key. Design A and B to occupy different zones - if A is left-heavy, B should be right-heavy. Check the Merged Preview before deriving. The entropy bar is live.

---

## The Reconstruction Test - Not Optional

Before loading any real funds:

1. Draw your shapes. Derive your key. Write down words 1–3 and 22–24.
2. Click **SAVE AS REF.**
3. Click **CLR ALL.**
4. Redraw everything from memory alone.
5. Click **COMPUTE MATCH** - must show 100% on all layers.
6. Derive again - the anchor words must match exactly.
7. Repeat on three separate days before loading funds.

if you cannot achieve perfect reconstruction, your shape description is not precise enough. You need language like *"letter M, block style, columns 1–6, full height rows 1–8, diagonal from col 3 row 1 to col 5 row 4"* - not a vague visual impression. That level of precision is the minimum for something controlling irreversible financial value.

---

## Technical Stack

- **Zero dependencies** in basic mode - pure WebCrypto APi
- **Argon2id** via bundled WASM (argon2-bundled.min.js) in advanced mode
- **BiP39** standard 2048-word English wordlist
- **Content Security Policy** header blocking all external resource loads
- **Single HTML file** - the entire application is auditable in one read
- **100% offline** - runs on Tails, air-gapped machines, fresh browsers with no network

---

## What This is Not

ShapeSeed is not a replacement for hardware wallets for most people. A Ledger or Trezus is simpler and harder to use wrong. ShapeSeed is for specific threat models - people who need key sovereignty without physical artifacts, people who need plausible deniability, people in environments where carrying hardware is dangerous or impossible.

it is also not a brain wallet in the traditional sense. Traditional brain wallets fail because human-chosen phrases live in dictionaries. ShapeSeed's entropy comes from two-dimensional personal spatial memory combined across layers with memory-hard PiN hardening - a fundamentally different attack surface. There is no wordlist for your drawing.

---

## Shape Design - Brief Guide

**Good shapes:** Personal symbols with asymmetry. Your initials in your handwriting style. A route you walk every day. Something with emotional memory that is impossible to guess and not in any database.

**Bad shapes:** Mathematical sequences (enumerable). Simple geometric primitives - crosses, rectangles, circles (too few possibilities). Anything you saw in an example (shared entropy space).

**A and B must be complementary, not similar.** Check the Merged Preview. if it looks sparser than either layer alone, you have cancellation. Redesign.

**Noise in corners only.** Memorize as compass directions from each corner. Never as absolute grid coordinates.

---
My Approach

first shape 
<img width="1828" height="998" alt="image" src="https://github.com/user-attachments/assets/825c83df-6ea6-4e18-a886-39faafdcb7c6" />


second shape
<img width="1828" height="998" alt="image" src="https://github.com/user-attachments/assets/7d46ff17-7e00-4ae7-85a3-62227478fd7e" />


merged 
<img width="1828" height="998" alt="image" src="https://github.com/user-attachments/assets/28abde99-694a-4bca-86ee-473cb7b59a62" />

it says first148 btw haha 



we can derive the seed from that shape directly 

<img width="1828" height="998" alt="image" src="https://github.com/user-attachments/assets/49a17467-b222-4bab-86cd-97f6f80b6f75" />
<img width="1828" height="998" alt="image" src="https://github.com/user-attachments/assets/fe7631b8-e2e2-416f-841e-0797c2104876" />

<img width="1159" height="248" alt="image" src="https://github.com/user-attachments/assets/17647d0e-b848-4795-8807-3257a68a9300" />

for verification i passed the hex on [iancoleman](https://iancoleman.io/bip39/) official website and got same words like mine  

tube tomorrow fire amateur angle prevent choose december fee extend cannon right park drama impulse drum picture picture loud emerge emerge attack multiply mass

<img width="1776" height="945" alt="image" src="https://github.com/user-attachments/assets/62df5a9a-ee74-4489-90fa-e608b2641c4f" />
<img width="1776" height="945" alt="image" src="https://github.com/user-attachments/assets/b06a03a3-d3b0-44af-bc49-a87f45ad87fc" />


Dont use shapes like it ( it's too simple ) 


in Advanced mode i am testing the Argon2id using empty grid with all zeros + pin which is 'a' 

<img width="1769" height="992" alt="image" src="https://github.com/user-attachments/assets/00ff8824-3a4a-4c80-b680-cbb86aec8f0d" />
<img width="1782" height="992" alt="image" src="https://github.com/user-attachments/assets/dd39afa8-a24c-4747-a85b-59bf2e529d27" />

As you see they match ( these means that both BIPS0039 + Argon2id are implemented correctly :)) )

<img width="1782" height="992" alt="image" src="https://github.com/user-attachments/assets/d308e671-640b-48bd-9161-8f1b2bb33b25" />


generating the seed using pass is 100x more secured because it uses Argon2id
---

## License

MiT. Audit it. Fork it. Run it offline. That is the point.

---

*ShapeSeed was built on the premise that human spatial memory is deeper and more durable than verbal memory, and that key generation systems should be designed around how human minds actually work - not around what is convenient for computers.*
