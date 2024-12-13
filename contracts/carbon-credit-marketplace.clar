;; Carbon Credit Marketplace Contract

(define-map listings
  { listing-id: uint }
  {
    seller: principal,
    amount: uint,
    price: uint,
    active: bool
  }
)

(define-data-var next-listing-id uint u1)

(define-constant err-not-found (err u100))
(define-constant err-unauthorized (err u101))
(define-constant err-inactive-listing (err u102))
(define-constant err-insufficient-balance (err u103))
(define-constant err-insufficient-funds (err u104))

(define-public (create-listing (amount uint) (price uint))
  (let
    ((listing-id (var-get next-listing-id)))
    (try! (contract-call? .carbon-credit-token transfer amount tx-sender (as-contract tx-sender)))
    (map-set listings
      { listing-id: listing-id }
      {
        seller: tx-sender,
        amount: amount,
        price: price,
        active: true
      }
    )
    (var-set next-listing-id (+ listing-id u1))
    (ok listing-id)
  )
)

(define-public (cancel-listing (listing-id uint))
  (let
    ((listing (unwrap! (map-get? listings { listing-id: listing-id }) err-not-found)))
    (asserts! (is-eq (get seller listing) tx-sender) err-unauthorized)
    (asserts! (get active listing) err-inactive-listing)
    (try! (as-contract (contract-call? .carbon-credit-token transfer (get amount listing) tx-sender (get seller listing))))
    (ok (map-set listings
      { listing-id: listing-id }
      (merge listing { active: false })
    ))
  )
)

(define-public (buy-credits (listing-id uint))
  (let
    ((listing (unwrap! (map-get? listings { listing-id: listing-id }) err-not-found)))
    (asserts! (get active listing) err-inactive-listing)
    (asserts! (>= (stx-get-balance tx-sender) (get price listing)) err-insufficient-funds)
    (try! (stx-transfer? (get price listing) tx-sender (get seller listing)))
    (try! (as-contract (contract-call? .carbon-credit-token transfer (get amount listing) tx-sender tx-sender)))
    (ok (map-set listings
      { listing-id: listing-id }
      (merge listing { active: false })
    ))
  )
)

(define-read-only (get-listing (listing-id uint))
  (ok (unwrap! (map-get? listings { listing-id: listing-id }) err-not-found))
)

