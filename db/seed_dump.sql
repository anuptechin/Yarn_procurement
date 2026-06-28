--
-- PostgreSQL database dump
--

\restrict 2iPDCnCnUTyTdatqTLkBYFS2BKn4F87QDFGmvoJuJUB3uvUnwFTuc4EPaPcEZuC

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.vendor_certificates DROP CONSTRAINT IF EXISTS vendor_certificates_vendor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.rfqs DROP CONSTRAINT IF EXISTS rfqs_vendor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.rfqs DROP CONSTRAINT IF EXISTS rfqs_requirement_id_fkey;
ALTER TABLE IF EXISTS ONLY public.requirements DROP CONSTRAINT IF EXISTS requirements_raised_by_fkey;
ALTER TABLE IF EXISTS ONLY public.requirements DROP CONSTRAINT IF EXISTS requirements_approved_by_fkey;
ALTER TABLE IF EXISTS ONLY public.requirement_items DROP CONSTRAINT IF EXISTS requirement_items_requirement_id_fkey;
ALTER TABLE IF EXISTS ONLY public.requirement_items DROP CONSTRAINT IF EXISTS requirement_items_material_id_fkey;
ALTER TABLE IF EXISTS ONLY public.requirement_items DROP CONSTRAINT IF EXISTS requirement_items_last_supplier_id_fkey;
ALTER TABLE IF EXISTS ONLY public.quotes DROP CONSTRAINT IF EXISTS quotes_rfq_id_fkey;
ALTER TABLE IF EXISTS ONLY public.quote_lines DROP CONSTRAINT IF EXISTS quote_lines_requirement_item_id_fkey;
ALTER TABLE IF EXISTS ONLY public.quote_lines DROP CONSTRAINT IF EXISTS quote_lines_quote_id_fkey;
ALTER TABLE IF EXISTS ONLY public.price_history DROP CONSTRAINT IF EXISTS price_history_vendor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.price_history DROP CONSTRAINT IF EXISTS price_history_material_id_fkey;
ALTER TABLE IF EXISTS ONLY public.awards DROP CONSTRAINT IF EXISTS awards_vendor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.awards DROP CONSTRAINT IF EXISTS awards_requirement_item_id_fkey;
ALTER TABLE IF EXISTS ONLY public.awards DROP CONSTRAINT IF EXISTS awards_requirement_id_fkey;
ALTER TABLE IF EXISTS ONLY public.awards DROP CONSTRAINT IF EXISTS awards_quote_line_id_fkey;
ALTER TABLE IF EXISTS ONLY public.awards DROP CONSTRAINT IF EXISTS awards_decided_by_fkey;
ALTER TABLE IF EXISTS ONLY public.audit_log DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;
DROP INDEX IF EXISTS public.idx_price_history_mat;
ALTER TABLE IF EXISTS ONLY public.vendors DROP CONSTRAINT IF EXISTS vendors_pkey;
ALTER TABLE IF EXISTS ONLY public.vendor_certificates DROP CONSTRAINT IF EXISTS vendor_certificates_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.rfqs DROP CONSTRAINT IF EXISTS rfqs_token_key;
ALTER TABLE IF EXISTS ONLY public.rfqs DROP CONSTRAINT IF EXISTS rfqs_requirement_id_vendor_id_key;
ALTER TABLE IF EXISTS ONLY public.rfqs DROP CONSTRAINT IF EXISTS rfqs_pkey;
ALTER TABLE IF EXISTS ONLY public.requirements DROP CONSTRAINT IF EXISTS requirements_ref_no_key;
ALTER TABLE IF EXISTS ONLY public.requirements DROP CONSTRAINT IF EXISTS requirements_pkey;
ALTER TABLE IF EXISTS ONLY public.requirement_items DROP CONSTRAINT IF EXISTS requirement_items_pkey;
ALTER TABLE IF EXISTS ONLY public.quotes DROP CONSTRAINT IF EXISTS quotes_rfq_id_key;
ALTER TABLE IF EXISTS ONLY public.quotes DROP CONSTRAINT IF EXISTS quotes_pkey;
ALTER TABLE IF EXISTS ONLY public.quote_lines DROP CONSTRAINT IF EXISTS quote_lines_pkey;
ALTER TABLE IF EXISTS ONLY public.price_history DROP CONSTRAINT IF EXISTS price_history_pkey;
ALTER TABLE IF EXISTS ONLY public.materials DROP CONSTRAINT IF EXISTS materials_pkey;
ALTER TABLE IF EXISTS ONLY public.materials DROP CONSTRAINT IF EXISTS materials_mat_code_key;
ALTER TABLE IF EXISTS ONLY public.awards DROP CONSTRAINT IF EXISTS awards_requirement_item_id_key;
ALTER TABLE IF EXISTS ONLY public.awards DROP CONSTRAINT IF EXISTS awards_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_log DROP CONSTRAINT IF EXISTS audit_log_pkey;
ALTER TABLE IF EXISTS public.vendors ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.vendor_certificates ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.rfqs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.requirements ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.requirement_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.quotes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.quote_lines ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.price_history ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.materials ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.awards ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.audit_log ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.vendors_id_seq;
DROP TABLE IF EXISTS public.vendors;
DROP SEQUENCE IF EXISTS public.vendor_certificates_id_seq;
DROP TABLE IF EXISTS public.vendor_certificates;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.rfqs_id_seq;
DROP TABLE IF EXISTS public.rfqs;
DROP SEQUENCE IF EXISTS public.requirements_id_seq;
DROP TABLE IF EXISTS public.requirements;
DROP SEQUENCE IF EXISTS public.requirement_items_id_seq;
DROP TABLE IF EXISTS public.requirement_items;
DROP SEQUENCE IF EXISTS public.quotes_id_seq;
DROP TABLE IF EXISTS public.quotes;
DROP SEQUENCE IF EXISTS public.quote_lines_id_seq;
DROP TABLE IF EXISTS public.quote_lines;
DROP SEQUENCE IF EXISTS public.price_history_id_seq;
DROP TABLE IF EXISTS public.price_history;
DROP SEQUENCE IF EXISTS public.materials_id_seq;
DROP TABLE IF EXISTS public.materials;
DROP SEQUENCE IF EXISTS public.awards_id_seq;
DROP TABLE IF EXISTS public.awards;
DROP SEQUENCE IF EXISTS public.audit_log_id_seq;
DROP TABLE IF EXISTS public.audit_log;
-- *not* dropping schema, since initdb creates it
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    user_id integer,
    action text NOT NULL,
    entity text,
    entity_id integer,
    detail text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: awards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.awards (
    id integer NOT NULL,
    requirement_id integer NOT NULL,
    requirement_item_id integer NOT NULL,
    vendor_id integer NOT NULL,
    quote_line_id integer,
    awarded_price numeric(14,4),
    decided_by integer,
    decided_at timestamp with time zone DEFAULT now() NOT NULL,
    justification text
);


--
-- Name: awards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.awards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: awards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.awards_id_seq OWNED BY public.awards.id;


--
-- Name: materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materials (
    id integer NOT NULL,
    mat_code text NOT NULL,
    description text NOT NULL,
    category text,
    uom text DEFAULT 'Kg'::text NOT NULL,
    active integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: materials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.materials_id_seq OWNED BY public.materials.id;


--
-- Name: price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_history (
    id integer NOT NULL,
    material_id integer NOT NULL,
    price_date text NOT NULL,
    price_per_kg numeric(14,4) NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    source text DEFAULT 'po'::text NOT NULL,
    vendor_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: price_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.price_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: price_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.price_history_id_seq OWNED BY public.price_history.id;


--
-- Name: quote_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_lines (
    id integer NOT NULL,
    quote_id integer NOT NULL,
    requirement_item_id integer NOT NULL,
    price_per_kg numeric(14,4),
    currency text DEFAULT 'INR'::text NOT NULL,
    gst_pct numeric(5,2) DEFAULT 0,
    lead_time_days integer,
    payment_terms text,
    remarks text,
    no_quote integer DEFAULT 0 NOT NULL
);


--
-- Name: quote_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quote_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quote_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quote_lines_id_seq OWNED BY public.quote_lines.id;


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id integer NOT NULL,
    rfq_id integer NOT NULL,
    entered_via text DEFAULT 'manual'::text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    submitted_by text,
    valid_until text,
    notes text
);


--
-- Name: quotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quotes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quotes_id_seq OWNED BY public.quotes.id;


--
-- Name: requirement_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requirement_items (
    id integer NOT NULL,
    requirement_id integer NOT NULL,
    material_id integer,
    mat_code text,
    description text,
    required_qty_kg numeric(14,3) NOT NULL,
    target_price numeric(14,4),
    last_po_price numeric(14,4),
    last_po_date text,
    last_supplier_id integer,
    last_supplier_name text,
    line_no integer DEFAULT 1 NOT NULL
);


--
-- Name: requirement_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.requirement_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: requirement_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.requirement_items_id_seq OWNED BY public.requirement_items.id;


--
-- Name: requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requirements (
    id integer NOT NULL,
    ref_no text NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    needed_by text,
    raised_by integer NOT NULL,
    approved_by integer,
    approved_at timestamp with time zone,
    rejected_reason text,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.requirements_id_seq OWNED BY public.requirements.id;


--
-- Name: rfqs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfqs (
    id integer NOT NULL,
    requirement_id integer NOT NULL,
    vendor_id integer NOT NULL,
    token text NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    due_date text,
    sent_at timestamp with time zone,
    viewed_at timestamp with time zone,
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rfqs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rfqs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rfqs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rfqs_id_seq OWNED BY public.rfqs.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    password_hash text NOT NULL,
    active integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vendor_certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_certificates (
    id integer NOT NULL,
    vendor_id integer NOT NULL,
    cert_type text NOT NULL,
    issued_by text,
    issue_date text,
    expiry_date text,
    remark text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vendor_certificates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_certificates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_certificates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_certificates_id_seq OWNED BY public.vendor_certificates.id;


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id integer NOT NULL,
    name text NOT NULL,
    contact_person text,
    email text,
    phone text,
    address text,
    gst_no text,
    rating numeric(2,1) DEFAULT 3,
    default_payment_terms text,
    default_lead_time integer,
    active integer DEFAULT 1 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vendors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendors_id_seq OWNED BY public.vendors.id;


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: awards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards ALTER COLUMN id SET DEFAULT nextval('public.awards_id_seq'::regclass);


--
-- Name: materials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials ALTER COLUMN id SET DEFAULT nextval('public.materials_id_seq'::regclass);


--
-- Name: price_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history ALTER COLUMN id SET DEFAULT nextval('public.price_history_id_seq'::regclass);


--
-- Name: quote_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_lines ALTER COLUMN id SET DEFAULT nextval('public.quote_lines_id_seq'::regclass);


--
-- Name: quotes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes ALTER COLUMN id SET DEFAULT nextval('public.quotes_id_seq'::regclass);


--
-- Name: requirement_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_items ALTER COLUMN id SET DEFAULT nextval('public.requirement_items_id_seq'::regclass);


--
-- Name: requirements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirements ALTER COLUMN id SET DEFAULT nextval('public.requirements_id_seq'::regclass);


--
-- Name: rfqs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs ALTER COLUMN id SET DEFAULT nextval('public.rfqs_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vendor_certificates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_certificates ALTER COLUMN id SET DEFAULT nextval('public.vendor_certificates_id_seq'::regclass);


--
-- Name: vendors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors ALTER COLUMN id SET DEFAULT nextval('public.vendors_id_seq'::regclass);


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_log (id, user_id, action, entity, entity_id, detail, created_at) FROM stdin;
\.


--
-- Data for Name: awards; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.awards (id, requirement_id, requirement_item_id, vendor_id, quote_line_id, awarded_price, decided_by, decided_at, justification) FROM stdin;
\.


--
-- Data for Name: materials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.materials (id, mat_code, description, category, uom, active, created_at) FROM stdin;
1	50302SP0	2/30 SPUN POLYESTER KNOTLESS	Polyester	Kg	1	2026-06-29 03:23:17.675962+05:30
2	50301SCC	50301SCC 1/30 Combed Compact Cotton Yarn	Cotton	Kg	1	2026-06-29 03:23:17.680763+05:30
3	50401SCC	50401SCC 1/40 Combed Compact RS Wvg Cotton	Cotton	Kg	1	2026-06-29 03:23:17.682275+05:30
4	50062CRS	50062CRS 2/6 KARDED COTTON (1PLY SLUB)	Cotton	Kg	1	2026-06-29 03:23:17.683493+05:30
5	50D61CCV	50D61CCV 0.6 Combed Cotton Roving	Cotton	Kg	1	2026-06-29 03:23:17.684471+05:30
6	50201SC0	50201SC0 1/20 Combed RS Wvg Cotton	Cotton	Kg	1	2026-06-29 03:23:17.685402+05:30
7	50162CWS	50162CWS 2/16 Combed Slub Yarn (16CW Slub+16 CW)	Cotton	Kg	1	2026-06-29 03:23:17.686322+05:30
8	50161SLL	50161SLL 16 LEA LINEN BLEACH SEMI LONG	Linen	Kg	1	2026-06-29 03:23:17.687224+05:30
9	52200F298	52200F298 2000d SF 298 COTTON LINEN 85/15	Blends	Kg	1	2026-06-29 03:23:17.688697+05:30
10	50D61RPL	50D61RPL 0.6 HANK POLY LINEN ROVING 85/15	Polyester	Kg	1	2026-06-29 03:23:17.690123+05:30
11	50162SPRF	50162SPRF 2/16 SPARROW PC 50/50 CONTMINATION FREE	Blends	Kg	1	2026-06-29 03:23:17.691482+05:30
\.


--
-- Data for Name: price_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.price_history (id, material_id, price_date, price_per_kg, currency, source, vendor_id, created_at) FROM stdin;
1	2	2026-04-30	290.0000	INR	market	\N	2026-06-29 03:23:17.700158+05:30
2	2	2026-03-04	270.0000	INR	market	\N	2026-06-29 03:23:17.70296+05:30
3	2	2026-02-10	272.0000	INR	market	\N	2026-06-29 03:23:17.704112+05:30
4	2	2026-01-01	256.0000	INR	market	\N	2026-06-29 03:23:17.705267+05:30
5	2	2025-12-01	251.0000	INR	market	\N	2026-06-29 03:23:17.706344+05:30
6	2	2025-11-01	251.0000	INR	market	\N	2026-06-29 03:23:17.707453+05:30
7	2	2025-08-30	258.0000	INR	market	\N	2026-06-29 03:23:17.708775+05:30
8	2	2025-08-01	263.0000	INR	market	\N	2026-06-29 03:23:17.710168+05:30
9	2	2025-07-01	260.0000	INR	market	\N	2026-06-29 03:23:17.711281+05:30
10	2	2025-06-04	260.0000	INR	market	\N	2026-06-29 03:23:17.712329+05:30
11	2	2025-04-01	265.0000	INR	market	\N	2026-06-29 03:23:17.713297+05:30
12	2	2025-03-01	262.0000	INR	market	\N	2026-06-29 03:23:17.714442+05:30
13	2	2025-02-15	260.0000	INR	market	\N	2026-06-29 03:23:17.715534+05:30
14	2	2025-02-01	260.0000	INR	market	\N	2026-06-29 03:23:17.716454+05:30
15	2	2025-01-15	258.0000	INR	market	\N	2026-06-29 03:23:17.717422+05:30
16	2	2025-10-01	253.0000	INR	market	\N	2026-06-29 03:23:17.71828+05:30
17	3	2026-04-30	317.0000	INR	market	\N	2026-06-29 03:23:17.721824+05:30
18	3	2026-03-04	300.0000	INR	market	\N	2026-06-29 03:23:17.722523+05:30
19	3	2026-02-10	300.0000	INR	market	\N	2026-06-29 03:23:17.723342+05:30
20	3	2026-01-01	282.0000	INR	market	\N	2026-06-29 03:23:17.72438+05:30
21	3	2025-12-01	278.0000	INR	market	\N	2026-06-29 03:23:17.725224+05:30
22	3	2025-11-01	278.0000	INR	market	\N	2026-06-29 03:23:17.726223+05:30
23	3	2025-08-30	282.0000	INR	market	\N	2026-06-29 03:23:17.727297+05:30
24	3	2025-08-01	285.0000	INR	market	\N	2026-06-29 03:23:17.728539+05:30
25	3	2025-07-01	285.0000	INR	market	\N	2026-06-29 03:23:17.729535+05:30
26	3	2025-06-04	285.0000	INR	market	\N	2026-06-29 03:23:17.730478+05:30
27	3	2025-04-01	288.0000	INR	market	\N	2026-06-29 03:23:17.731279+05:30
28	3	2025-03-01	285.0000	INR	market	\N	2026-06-29 03:23:17.732084+05:30
29	3	2025-02-15	285.0000	INR	market	\N	2026-06-29 03:23:17.732832+05:30
30	3	2025-02-01	284.0000	INR	market	\N	2026-06-29 03:23:17.733793+05:30
31	3	2025-01-15	283.0000	INR	market	\N	2026-06-29 03:23:17.734674+05:30
32	3	2025-10-01	278.0000	INR	market	\N	2026-06-29 03:23:17.735411+05:30
33	4	2026-03-04	266.0000	INR	market	\N	2026-06-29 03:23:17.738974+05:30
34	4	2026-02-10	266.0000	INR	market	\N	2026-06-29 03:23:17.740666+05:30
35	4	2026-01-01	258.0000	INR	market	\N	2026-06-29 03:23:17.741731+05:30
36	4	2025-12-01	255.0000	INR	market	\N	2026-06-29 03:23:17.74271+05:30
37	4	2025-11-01	255.0000	INR	market	\N	2026-06-29 03:23:17.743527+05:30
38	4	2025-08-30	258.0000	INR	market	\N	2026-06-29 03:23:17.74427+05:30
39	4	2025-08-01	260.0000	INR	market	\N	2026-06-29 03:23:17.744956+05:30
40	4	2025-07-01	252.0000	INR	market	\N	2026-06-29 03:23:17.745699+05:30
41	4	2025-06-04	252.0000	INR	market	\N	2026-06-29 03:23:17.746863+05:30
42	4	2025-04-01	254.0000	INR	market	\N	2026-06-29 03:23:17.747597+05:30
43	4	2025-03-01	251.0000	INR	market	\N	2026-06-29 03:23:17.748473+05:30
44	4	2025-02-15	251.0000	INR	market	\N	2026-06-29 03:23:17.749433+05:30
45	4	2025-02-01	251.0000	INR	market	\N	2026-06-29 03:23:17.750239+05:30
46	4	2025-01-15	252.0000	INR	market	\N	2026-06-29 03:23:17.750967+05:30
47	4	2025-10-01	255.0000	INR	market	\N	2026-06-29 03:23:17.751708+05:30
48	5	2026-03-04	250.0000	INR	market	\N	2026-06-29 03:23:17.754703+05:30
49	5	2026-02-10	250.0000	INR	market	\N	2026-06-29 03:23:17.755981+05:30
50	5	2026-01-01	243.0000	INR	market	\N	2026-06-29 03:23:17.756993+05:30
51	5	2025-12-01	240.0000	INR	market	\N	2026-06-29 03:23:17.757845+05:30
52	5	2025-11-01	240.0000	INR	market	\N	2026-06-29 03:23:17.759016+05:30
53	5	2025-08-30	242.0000	INR	market	\N	2026-06-29 03:23:17.760071+05:30
54	5	2025-08-01	252.0000	INR	market	\N	2026-06-29 03:23:17.761446+05:30
55	5	2025-07-01	251.0000	INR	market	\N	2026-06-29 03:23:17.762189+05:30
56	5	2025-06-04	251.0000	INR	market	\N	2026-06-29 03:23:17.763002+05:30
57	5	2025-04-01	250.0000	INR	market	\N	2026-06-29 03:23:17.763783+05:30
58	5	2025-03-01	250.0000	INR	market	\N	2026-06-29 03:23:17.764523+05:30
59	5	2025-02-15	252.0000	INR	market	\N	2026-06-29 03:23:17.765217+05:30
60	5	2025-02-01	252.0000	INR	market	\N	2026-06-29 03:23:17.765921+05:30
61	5	2025-01-15	252.0000	INR	market	\N	2026-06-29 03:23:17.766614+05:30
62	5	2025-10-01	240.0000	INR	market	\N	2026-06-29 03:23:17.767326+05:30
63	6	2026-04-30	265.0000	INR	market	\N	2026-06-29 03:23:17.77061+05:30
64	6	2026-03-04	255.0000	INR	market	\N	2026-06-29 03:23:17.771571+05:30
65	6	2026-02-10	255.0000	INR	market	\N	2026-06-29 03:23:17.772639+05:30
66	6	2026-01-01	240.0000	INR	market	\N	2026-06-29 03:23:17.773485+05:30
67	6	2025-12-01	235.0000	INR	market	\N	2026-06-29 03:23:17.77428+05:30
68	6	2025-11-01	235.0000	INR	market	\N	2026-06-29 03:23:17.77507+05:30
69	6	2025-08-30	237.0000	INR	market	\N	2026-06-29 03:23:17.776458+05:30
70	6	2025-08-01	242.0000	INR	market	\N	2026-06-29 03:23:17.777844+05:30
71	6	2025-07-01	240.0000	INR	market	\N	2026-06-29 03:23:17.779247+05:30
72	6	2025-06-04	240.0000	INR	market	\N	2026-06-29 03:23:17.780298+05:30
73	6	2025-04-01	242.0000	INR	market	\N	2026-06-29 03:23:17.781268+05:30
74	6	2025-03-01	240.0000	INR	market	\N	2026-06-29 03:23:17.782196+05:30
75	6	2025-02-15	242.0000	INR	market	\N	2026-06-29 03:23:17.783754+05:30
76	6	2025-02-01	242.0000	INR	market	\N	2026-06-29 03:23:17.784946+05:30
77	6	2025-01-15	240.0000	INR	market	\N	2026-06-29 03:23:17.785983+05:30
78	6	2025-10-01	235.0000	INR	market	\N	2026-06-29 03:23:17.787032+05:30
79	7	2026-03-04	310.0000	INR	market	\N	2026-06-29 03:23:17.79144+05:30
80	7	2026-02-10	310.0000	INR	market	\N	2026-06-29 03:23:17.792544+05:30
81	7	2026-01-01	300.0000	INR	market	\N	2026-06-29 03:23:17.794514+05:30
82	7	2025-12-01	295.0000	INR	market	\N	2026-06-29 03:23:17.795619+05:30
83	7	2025-11-01	295.0000	INR	market	\N	2026-06-29 03:23:17.796697+05:30
84	7	2025-08-30	300.0000	INR	market	\N	2026-06-29 03:23:17.797695+05:30
85	7	2025-08-01	300.0000	INR	market	\N	2026-06-29 03:23:17.798852+05:30
86	7	2025-07-01	300.0000	INR	market	\N	2026-06-29 03:23:17.799849+05:30
87	7	2025-06-04	299.0000	INR	market	\N	2026-06-29 03:23:17.800789+05:30
88	7	2025-04-01	299.0000	INR	market	\N	2026-06-29 03:23:17.801859+05:30
89	7	2025-03-01	297.0000	INR	market	\N	2026-06-29 03:23:17.803282+05:30
90	7	2025-02-15	297.0000	INR	market	\N	2026-06-29 03:23:17.804523+05:30
91	7	2025-02-01	297.0000	INR	market	\N	2026-06-29 03:23:17.805905+05:30
92	7	2025-01-15	300.0000	INR	market	\N	2026-06-29 03:23:17.806816+05:30
93	7	2025-10-01	300.0000	INR	market	\N	2026-06-29 03:23:17.807735+05:30
94	8	2026-03-04	1065.0000	INR	market	\N	2026-06-29 03:23:17.811477+05:30
95	8	2026-02-10	1060.0000	INR	market	\N	2026-06-29 03:23:17.812451+05:30
96	8	2026-01-01	1050.0000	INR	market	\N	2026-06-29 03:23:17.813408+05:30
97	8	2025-12-01	1040.0000	INR	market	\N	2026-06-29 03:23:17.81415+05:30
98	8	2025-11-01	1065.0000	INR	market	\N	2026-06-29 03:23:17.815019+05:30
99	8	2025-08-30	1045.0000	INR	market	\N	2026-06-29 03:23:17.815866+05:30
100	8	2025-08-01	970.0000	INR	market	\N	2026-06-29 03:23:17.816731+05:30
101	8	2025-07-01	790.0000	INR	market	\N	2026-06-29 03:23:17.817618+05:30
102	8	2025-06-04	720.0000	INR	market	\N	2026-06-29 03:23:17.818725+05:30
103	8	2025-04-01	720.0000	INR	market	\N	2026-06-29 03:23:17.819715+05:30
104	8	2025-03-01	720.0000	INR	market	\N	2026-06-29 03:23:17.820698+05:30
105	8	2025-02-15	720.0000	INR	market	\N	2026-06-29 03:23:17.821896+05:30
106	8	2025-02-01	770.0000	INR	market	\N	2026-06-29 03:23:17.823364+05:30
107	8	2025-01-15	770.0000	INR	market	\N	2026-06-29 03:23:17.824763+05:30
108	8	2025-10-01	1045.0000	INR	market	\N	2026-06-29 03:23:17.826038+05:30
109	9	2026-03-04	461.0000	INR	market	\N	2026-06-29 03:23:17.83312+05:30
110	9	2026-02-10	460.0000	INR	market	\N	2026-06-29 03:23:17.834095+05:30
111	9	2026-01-01	455.0000	INR	market	\N	2026-06-29 03:23:17.835379+05:30
112	9	2025-12-01	445.0000	INR	market	\N	2026-06-29 03:23:17.836585+05:30
113	9	2025-11-01	448.2800	INR	market	\N	2026-06-29 03:23:17.837643+05:30
114	9	2025-08-30	439.4400	INR	market	\N	2026-06-29 03:23:17.838765+05:30
115	9	2025-08-01	417.3100	INR	market	\N	2026-06-29 03:23:17.839917+05:30
116	9	2025-07-01	367.1100	INR	market	\N	2026-06-29 03:23:17.841021+05:30
117	9	2025-06-04	349.5000	INR	market	\N	2026-06-29 03:23:17.841907+05:30
118	9	2025-04-01	368.0200	INR	market	\N	2026-06-29 03:23:17.843281+05:30
119	9	2025-03-01	385.7900	INR	market	\N	2026-06-29 03:23:17.844508+05:30
120	9	2025-02-15	385.7900	INR	market	\N	2026-06-29 03:23:17.845732+05:30
121	9	2025-02-01	376.6100	INR	market	\N	2026-06-29 03:23:17.846594+05:30
122	9	2025-01-15	386.9200	INR	market	\N	2026-06-29 03:23:17.847439+05:30
123	9	2025-10-01	437.8900	INR	market	\N	2026-06-29 03:23:17.848052+05:30
124	10	2026-03-04	245.0000	INR	market	\N	2026-06-29 03:23:17.85071+05:30
125	10	2026-02-10	240.0000	INR	market	\N	2026-06-29 03:23:17.85149+05:30
126	10	2026-01-01	223.0000	INR	market	\N	2026-06-29 03:23:17.852562+05:30
127	10	2025-12-01	220.0000	INR	market	\N	2026-06-29 03:23:17.853652+05:30
128	10	2025-11-01	224.0000	INR	market	\N	2026-06-29 03:23:17.855168+05:30
129	10	2025-08-30	226.0000	INR	market	\N	2026-06-29 03:23:17.855859+05:30
130	10	2025-08-01	219.0000	INR	market	\N	2026-06-29 03:23:17.856813+05:30
131	10	2025-07-01	219.0000	INR	market	\N	2026-06-29 03:23:17.857948+05:30
132	10	2025-06-04	218.0000	INR	market	\N	2026-06-29 03:23:17.858727+05:30
133	10	2025-04-01	218.0000	INR	market	\N	2026-06-29 03:23:17.85983+05:30
134	10	2025-03-01	218.0000	INR	market	\N	2026-06-29 03:23:17.860778+05:30
135	10	2025-02-15	218.0000	INR	market	\N	2026-06-29 03:23:17.861763+05:30
136	10	2025-02-01	218.0000	INR	market	\N	2026-06-29 03:23:17.862696+05:30
137	10	2025-01-15	220.0000	INR	market	\N	2026-06-29 03:23:17.86355+05:30
138	10	2025-10-01	226.0000	INR	market	\N	2026-06-29 03:23:17.86469+05:30
139	11	2026-03-04	273.0000	INR	market	\N	2026-06-29 03:23:17.868483+05:30
140	11	2026-02-10	270.0000	INR	market	\N	2026-06-29 03:23:17.869979+05:30
141	11	2026-01-01	265.0000	INR	market	\N	2026-06-29 03:23:17.871219+05:30
142	11	2025-12-01	257.0000	INR	market	\N	2026-06-29 03:23:17.872429+05:30
143	11	2025-11-01	260.0000	INR	market	\N	2026-06-29 03:23:17.873216+05:30
144	11	2025-08-30	263.0000	INR	market	\N	2026-06-29 03:23:17.873882+05:30
145	11	2025-08-01	265.0000	INR	market	\N	2026-06-29 03:23:17.874858+05:30
146	11	2025-07-01	265.0000	INR	market	\N	2026-06-29 03:23:17.875913+05:30
147	11	2025-06-04	265.0000	INR	market	\N	2026-06-29 03:23:17.87714+05:30
148	11	2025-04-01	264.0000	INR	market	\N	2026-06-29 03:23:17.878251+05:30
149	11	2025-03-01	262.0000	INR	market	\N	2026-06-29 03:23:17.879444+05:30
150	11	2025-02-15	262.0000	INR	market	\N	2026-06-29 03:23:17.880605+05:30
151	11	2025-02-01	262.0000	INR	market	\N	2026-06-29 03:23:17.881835+05:30
152	11	2025-01-15	260.0000	INR	market	\N	2026-06-29 03:23:17.882862+05:30
153	11	2025-10-01	261.0000	INR	market	\N	2026-06-29 03:23:17.883603+05:30
154	1	2026-02-01	175.0000	INR	po	1	2026-06-29 03:23:17.885707+05:30
\.


--
-- Data for Name: quote_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quote_lines (id, quote_id, requirement_item_id, price_per_kg, currency, gst_pct, lead_time_days, payment_terms, remarks, no_quote) FROM stdin;
1	1	1	175.0000	INR	5.00	15	30 Days	\N	0
2	2	1	180.0000	INR	5.00	20	30 Days	\N	0
3	3	1	185.0000	INR	5.00	25	45 Days	\N	0
\.


--
-- Data for Name: quotes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quotes (id, rfq_id, entered_via, submitted_at, submitted_by, valid_until, notes) FROM stdin;
1	1	manual	2026-06-29 03:23:17.906662+05:30	Gimatex Industries	\N	\N
2	2	manual	2026-06-29 03:23:17.915422+05:30	RSWM Ltd	\N	\N
3	3	manual	2026-06-29 03:23:17.918003+05:30	Nitin Spinners Ltd	\N	\N
\.


--
-- Data for Name: requirement_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.requirement_items (id, requirement_id, material_id, mat_code, description, required_qty_kg, target_price, last_po_price, last_po_date, last_supplier_id, last_supplier_name, line_no) FROM stdin;
1	1	1	50302SP0	2/30 SPUN POLYESTER KNOTLESS	5000.000	\N	175.0000	2026-02-01	1	Gimatex Industries	1
\.


--
-- Data for Name: requirements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.requirements (id, ref_no, title, status, priority, needed_by, raised_by, approved_by, approved_at, rejected_reason, remarks, created_at, updated_at) FROM stdin;
1	YRN-2026-0001	Spun Polyester 2/30 — replenishment	comparison_ready	normal	2026-07-18	1	3	2026-06-29 03:23:17.893076+05:30	\N	Seeded demo requirement	2026-06-29 03:23:17.893076+05:30	2026-06-29 03:23:17.893076+05:30
\.


--
-- Data for Name: rfqs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rfqs (id, requirement_id, vendor_id, token, status, due_date, sent_at, viewed_at, responded_at, created_at) FROM stdin;
1	1	1	35RH4ZchTfzZLudZJBtvjKFH9eRB	responded	2026-07-08	2026-06-29 03:23:17.902342+05:30	\N	2026-06-29 03:23:17.902342+05:30	2026-06-29 03:23:17.902342+05:30
2	1	2	fpUV7uUhCA8SfaTPMubKF2CLF2kj	responded	2026-07-08	2026-06-29 03:23:17.914188+05:30	\N	2026-06-29 03:23:17.914188+05:30	2026-06-29 03:23:17.914188+05:30
3	1	3	uuL8nqvQgVDxUZd54Tsegbga586z	responded	2026-07-08	2026-06-29 03:23:17.91718+05:30	\N	2026-06-29 03:23:17.91718+05:30	2026-06-29 03:23:17.91718+05:30
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, role, password_hash, active, created_at) FROM stdin;
1	Ravi (Requisitioner)	requisitioner@ddecor.com	requisitioner	$2a$10$7UTVBO0qst.c9Iea3ky2PujzHmCeI3ovP81BUq0cgd//3jIfPQih.	1	2026-06-29 03:23:17.067701+05:30
2	Anupam (Procurement)	procurement@ddecor.com	procurement	$2a$10$0o8cyruGaF7aGNf/03Re0OOkyzurVM/iQZHCl6y1FShwElbwDJuZe	1	2026-06-29 03:23:17.22589+05:30
3	Dept Head (Yarn)	depthead@ddecor.com	depthead	$2a$10$O9YNOY6/Mb3aAqD7EZTp3.OJRt.LeKlmIJHQcT6yxtRspmn.zDWkm	1	2026-06-29 03:23:17.403209+05:30
4	Administrator	admin@ddecor.com	admin	$2a$10$v0Gl1kZaEgQtrQZDExPae.AgVIaTVeR32HIYgcp3El.B/4DO.VMUK	1	2026-06-29 03:23:17.602395+05:30
5	Super Admin	superadmin@ddecor.com	admin	$2a$10$jWe90S0bhGMYZN/M9tkHMOtYhXch/yR7bGntkGWA3lRRMxsQMVkj.	1	2026-06-29 03:44:32.62715+05:30
\.


--
-- Data for Name: vendor_certificates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendor_certificates (id, vendor_id, cert_type, issued_by, issue_date, expiry_date, remark, created_at) FROM stdin;
1	1	Oeko-Tex	2025-03-13	2025-03-13	2026-03-12	\N	2026-06-29 03:23:17.664533+05:30
2	1	GOTS	2025-03-13	2025-03-13	2026-03-12	\N	2026-06-29 03:23:17.668922+05:30
3	1	GRS Scope	2025-03-13	2025-03-13	2026-03-12	\N	2026-06-29 03:23:17.670834+05:30
4	2	Oeko-Tex	2025-06-01	2025-06-01	2026-05-31	\N	2026-06-29 03:23:17.6726+05:30
5	3	GRS Scope	2024-11-01	2024-11-01	2025-10-31	\N	2026-06-29 03:23:17.674454+05:30
\.


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendors (id, name, contact_person, email, phone, address, gst_no, rating, default_payment_terms, default_lead_time, active, notes, created_at) FROM stdin;
1	Gimatex Industries	Sales Desk	sales@gimatex.com	+91-7152-000000	Hinganghat, Maharashtra	27AAACG0000A1Z5	4.5	30 Days	15	1	\N	2026-06-29 03:23:17.649808+05:30
2	RSWM Ltd	Yarn Marketing	yarn@rswm.in	+91-1482-000000	Bhilwara, Rajasthan	08AAACR0000B1Z2	4.0	30 Days	20	1	\N	2026-06-29 03:23:17.655957+05:30
3	Nitin Spinners Ltd	Sales	sales@nitinspinners.com	+91-1482-111111	Bhilwara, Rajasthan	08AAACN0000C1Z9	3.8	45 Days	25	1	\N	2026-06-29 03:23:17.659274+05:30
\.


--
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_log_id_seq', 1, false);


--
-- Name: awards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.awards_id_seq', 1, false);


--
-- Name: materials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.materials_id_seq', 11, true);


--
-- Name: price_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.price_history_id_seq', 154, true);


--
-- Name: quote_lines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.quote_lines_id_seq', 3, true);


--
-- Name: quotes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.quotes_id_seq', 3, true);


--
-- Name: requirement_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.requirement_items_id_seq', 1, true);


--
-- Name: requirements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.requirements_id_seq', 1, true);


--
-- Name: rfqs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rfqs_id_seq', 3, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 5, true);


--
-- Name: vendor_certificates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.vendor_certificates_id_seq', 5, true);


--
-- Name: vendors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.vendors_id_seq', 3, true);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: awards awards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards
    ADD CONSTRAINT awards_pkey PRIMARY KEY (id);


--
-- Name: awards awards_requirement_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards
    ADD CONSTRAINT awards_requirement_item_id_key UNIQUE (requirement_item_id);


--
-- Name: materials materials_mat_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_mat_code_key UNIQUE (mat_code);


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (id);


--
-- Name: quote_lines quote_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_lines
    ADD CONSTRAINT quote_lines_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_rfq_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_rfq_id_key UNIQUE (rfq_id);


--
-- Name: requirement_items requirement_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_items
    ADD CONSTRAINT requirement_items_pkey PRIMARY KEY (id);


--
-- Name: requirements requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirements
    ADD CONSTRAINT requirements_pkey PRIMARY KEY (id);


--
-- Name: requirements requirements_ref_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirements
    ADD CONSTRAINT requirements_ref_no_key UNIQUE (ref_no);


--
-- Name: rfqs rfqs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_pkey PRIMARY KEY (id);


--
-- Name: rfqs rfqs_requirement_id_vendor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_requirement_id_vendor_id_key UNIQUE (requirement_id, vendor_id);


--
-- Name: rfqs rfqs_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_token_key UNIQUE (token);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vendor_certificates vendor_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_certificates
    ADD CONSTRAINT vendor_certificates_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: idx_price_history_mat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_history_mat ON public.price_history USING btree (material_id, price_date);


--
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: awards awards_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards
    ADD CONSTRAINT awards_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.users(id);


--
-- Name: awards awards_quote_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards
    ADD CONSTRAINT awards_quote_line_id_fkey FOREIGN KEY (quote_line_id) REFERENCES public.quote_lines(id) ON DELETE SET NULL;


--
-- Name: awards awards_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards
    ADD CONSTRAINT awards_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;


--
-- Name: awards awards_requirement_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards
    ADD CONSTRAINT awards_requirement_item_id_fkey FOREIGN KEY (requirement_item_id) REFERENCES public.requirement_items(id) ON DELETE CASCADE;


--
-- Name: awards awards_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards
    ADD CONSTRAINT awards_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: price_history price_history_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE;


--
-- Name: price_history price_history_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;


--
-- Name: quote_lines quote_lines_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_lines
    ADD CONSTRAINT quote_lines_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quote_lines quote_lines_requirement_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_lines
    ADD CONSTRAINT quote_lines_requirement_item_id_fkey FOREIGN KEY (requirement_item_id) REFERENCES public.requirement_items(id) ON DELETE CASCADE;


--
-- Name: quotes quotes_rfq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES public.rfqs(id) ON DELETE CASCADE;


--
-- Name: requirement_items requirement_items_last_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_items
    ADD CONSTRAINT requirement_items_last_supplier_id_fkey FOREIGN KEY (last_supplier_id) REFERENCES public.vendors(id) ON DELETE SET NULL;


--
-- Name: requirement_items requirement_items_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_items
    ADD CONSTRAINT requirement_items_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE SET NULL;


--
-- Name: requirement_items requirement_items_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirement_items
    ADD CONSTRAINT requirement_items_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;


--
-- Name: requirements requirements_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirements
    ADD CONSTRAINT requirements_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: requirements requirements_raised_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requirements
    ADD CONSTRAINT requirements_raised_by_fkey FOREIGN KEY (raised_by) REFERENCES public.users(id);


--
-- Name: rfqs rfqs_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;


--
-- Name: rfqs rfqs_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendor_certificates vendor_certificates_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_certificates
    ADD CONSTRAINT vendor_certificates_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 2iPDCnCnUTyTdatqTLkBYFS2BKn4F87QDFGmvoJuJUB3uvUnwFTuc4EPaPcEZuC

