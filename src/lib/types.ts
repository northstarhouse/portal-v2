export type DonorStatus = 'current' | 'recently_lapsed' | 'long_lapsed' | 'non_donor'

export interface Tag {
  id: string
  name: string
  color: string
  created_at: string
}

export type MemberTier =
  | 'shooting_star'
  | 'rising_star'
  | 'morning_star'
  | 'evening_star'
  | 'red_giant'
  | 'blue_giant'
  | 'none'

export interface Donor {
  id: string
  formal_name: string
  informal_first_name: string | null
  email: string | null
  phone: string | null
  employer: string | null
  address: string | null
  account_type: string | null
  donor_notes: string | null
  interests: string | null
  background: string | null
  nsh_contact: string | null
  first_connected: string | null
  historical_lifetime_giving: number
  historical_donation_count: number
  starred: boolean
  star_note: string | null
  deceased: boolean
  also_supports: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type DonationType = 'Donation' | 'Membership' | 'Restricted' | 'Membership, Donation' | 'Brick Purchase' | 'Tribute'
export type PaymentType = 'Website' | 'Check' | 'Cash' | 'Credit Card' | 'ACH' | 'Other'

export interface Donation {
  id: string
  donor_id: string
  amount: number
  date: string
  type: DonationType
  payment_type: PaymentType | null
  benefits: string | null
  acknowledged: boolean
  donation_notes: string | null
  created_at: string
}

export interface DonorList {
  id: string
  name: string
  created_at: string
  donor_count?: number
}

export type OutreachStatus = 'planned' | 'in_progress' | 'completed' | 'no_response' | 'follow_up'

export interface OutreachEntry {
  id: string
  area: string
  title: string
  contact: string | null
  linked_donor_id: string | null
  date: string | null
  status: OutreachStatus
  notes: string | null
  submitted_by: string | null
  created_at: string
}

export interface DonorWithStats extends Donor {
  donations: Donation[]
  current_year_total: number
  lifetime_total: number
  last_gift_amount: number | null
  last_gift_date: string | null
  total_donation_count: number
  status: DonorStatus
  tier: MemberTier
  tags?: Tag[]
}
