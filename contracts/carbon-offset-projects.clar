;; Carbon Offset Projects Contract

(define-map projects
  { project-id: uint }
  {
    owner: principal,
    description: (string-utf8 256),
    verified: bool,
    credits-issued: uint
  }
)

(define-data-var next-project-id uint u1)

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-already-verified (err u102))

(define-public (register-project (description (string-utf8 256)))
  (let
    ((project-id (var-get next-project-id)))
    (map-set projects
      { project-id: project-id }
      {
        owner: tx-sender,
        description: description,
        verified: false,
        credits-issued: u0
      }
    )
    (var-set next-project-id (+ project-id u1))
    (ok project-id)
  )
)

(define-public (verify-project (project-id uint))
  (let
    ((project (unwrap! (map-get? projects { project-id: project-id }) err-not-found)))
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (asserts! (not (get verified project)) err-already-verified)
    (ok (map-set projects
      { project-id: project-id }
      (merge project { verified: true })
    ))
  )
)

(define-public (issue-credits (project-id uint) (amount uint))
  (let
    ((project (unwrap! (map-get? projects { project-id: project-id }) err-not-found)))
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (asserts! (get verified project) err-not-found)
    (try! (contract-call? .carbon-credit-token mint amount (get owner project)))
    (ok (map-set projects
      { project-id: project-id }
      (merge project { credits-issued: (+ (get credits-issued project) amount) })
    ))
  )
)

(define-read-only (get-project (project-id uint))
  (ok (unwrap! (map-get? projects { project-id: project-id }) err-not-found))
)

