Edited company_id_workflow_guide.md
Viewed company_id_workflow_guide.md:1-109

Here is the complete step-by-step Company ID request process, from request creation to card printing, physical transmittal, and final claiming. You can copy and share this document directly with the testing team.

***

# Company ID Card Generation & Processing Guide

This document outlines the complete end-to-end workflow of the **Company ID Request** module in ABAS-V2. Use these steps to guide testers and verify that integration flows correctly across the Employee Portal, HR Module, and IT Helpdesk.

---

## Roles Required for Testing
To test the complete flow, you will need access to user accounts with the following roles/permissions:
1. **Employee**: Any regular employee who needs a new or replacement ID.
2. **Department Manager**: The designated manager (verifier) for the requesting employee.
3. **HR Officer**: Has the `human_resources|manage_id_requests` permission.
4. **IT Staff (Assessor/Worker)**: Has the `it|assess_ticket` and `it|work_ticket` permissions.
5. **IT Approver (Head/Director)**: Has the `it|approve_minor_ticket` or `it|approve_major_ticket` permission.

---

## Step-by-Step Processing Workflow

### Step 1: Employee Files the Request
1. Log in as an **Employee**.
2. Go to **My 201 File** (Corporate Services -> Employee File).
3. Click the **Company ID** tab.
4. Click **Request Company ID**.
5. Fill out the request form:
   - **Reason**: Choose one (`New`, `Lost`, `Damaged`, `Replacement`).
   - *Note: If `Lost`, `Damaged`, or `Replacement` is selected, you **must** upload a Supporting Document (e.g. Affidavit of Loss, photo of damaged ID).*
   - **Manager Verification**: Select your Department Manager.
   - **Approver**: Select the HR Approver.
6. Click **Submit Request**.
   - *The request status is now **`FOR VERIFICATION`**.*

---

### Step 2: HR Reviews & Approves the Request
1. Log in as an **HR Officer**.
2. Go to **HR -> Company ID Requests** (or view the employee's 201 file directly).
3. Under Actions, click **Approve** on the pending request.
   - *This transitions the request to **`APPROVED`**.*
   - *An **IT IRAAF Ticket** is automatically created with status **`Verified`** (bypassing initial verification since it was approved by the manager/HR).*
   - *The request is automatically pushed to the **fluffy-adventure** API.*

---

### Step 3: IT Ticket Assessment (IT Staff)
1. Log in as an **IT Staff / Assessor**.
2. Go to **IT Helpdesk -> Tickets -> For Assessment** queue.
3. Open the newly created automated ticket (e.g., ticket `#2607`).
4. You will see the verifier name successfully carried over from the HR request.
5. Under **Assessment Form**:
   - Set **Type** (e.g., `Minor`).
   - **Assign Ticket to**: Select the IT worker who will process/print the ID.
   - Enter **Assessment** notes (e.g., "Request valid, preparing print layout").
6. Click **Submit**.
   - *The ticket status transitions to **`Assessed`**.*

---

### Step 4: IT Ticket Noting (IT Staff)
1. Still in the IT Helpdesk, the assessor or designated noting staff opens the ticket.
2. Click the **Note** button at the top.
   - *The ticket status transitions to **`Noted`**.*

---

### Step 5: IT Ticket Approval (IT Approver)
1. Log in as the **IT Approver**.
2. Open the ticket from the **For Approval** queue.
3. Click the **Approve** button at the top.
   - *The ticket status transitions to **`Approved`**.*
   - *The ticket is now unassigned and ready for work.*

---

### Step 6: IT Card Printing & Webhook Sync (IT Worker)
1. Log in as the **IT Worker** assigned to the task.
2. Open the ticket. Click **Start Work** (status changes to `Working`).
3. Open the **AVPass ID Studio** interface at `https://avpass.abas.ph` (or your local equivalent).
4. Locate the ID request in the list. Note that:
   - The primary ID Request (`REQ-...`) and the **IRAAF Ticket ID** are clearly visible on the table and details drawer.
   - The redundant ABAS Request ID badge is hidden to keep references clean.
5. Click **Proceed to ID Builder** to design the ID card:
   - **Manual Photo/Signature Upload Overrides**: If the employee doesn't have an existing profile photo/signature in the system or you need to update them, use the **Upload Custom Assets** form in the "Employee Link" accordion on the left sidebar, or click the photo/signature layer on the card itself to upload/replace the image via the properties panel on the right.
   - The custom files will render immediately on the design canvas.
6. Click **Save ID**:
   - The frontend will automatically convert the designed card layout and any uploaded custom assets (avatar/signature overrides) and save them.
   - The backend uploads these custom assets to the MinIO server bucket (configured under `MINIO_BUCKET`) under `employees/{employee_id}/avatar.png` and `employees/{employee_id}/signature.png`, replacing raw base64 data with public MinIO URLs.
7. Once printing is complete, go back to the IT ticket in ABAS-V2 and click **Done Work** (status changes to **`Done`**).
   - *This triggers the sync webhook.*
   - *ABAS automatically calls fluffy-adventure to download the generated front/back ID images, caches the image URLs locally, and updates the Company ID Request status to **`PRINTED`**.*

---

### Step 7: HR Receives Physical Cards (HR Officer)
At this stage, the employee sees **"ID Printed"** (in transit) on their timeline and cannot claim it yet.
1. Log in as the **HR Officer**.
2. Go to **HR -> Company ID Requests**.
3. Once the physical card(s) arrive at the HR desk, you can:
   - **Individually**: Click the **Receive** button next to a specific request.
   - **In Bulk**: Tick the checkboxes on the left side of the table for the cards received, and click the batch button at the top: **"Receive Selected & Mark Ready"**.
4. Confirm the prompt.
   - *The request status transitions to **`ID_READY`**.*
   - *The employee's portal now displays **"Ready to Claim"**.*

---

### Step 8: Employee Claims the ID Card
1. The **Employee** visits the HR Office to pick up their physical ID card.
2. Once handed over:
   - **By HR**: The HR officer can click **Mark Claimed** on their dashboard.
   - **By Employee**: Alternatively, the employee can click **"I have received my physical ID"** directly on their 201 Company ID portal.
3. The request transitions to **`CLAIMED`** (terminal state), allowing them to file a new request in the future if they ever lose it.

---

## Interactive ID Card Renders
- On **HR (All Requests / Employee 201)** and **IT Company ID listing** pages, any row with a generated ID will have a cursor pointer. 
- Click on any row to expand/collapse and view the front and back of the generated ID card images!

***

### ⚠️ Tester Notes on Testing Existing Tickets (e.g. #2607)
If there are pre-existing tickets in the test database that were stuck without a verifier or in the wrong status, testers can visit the following helper URL in their browser to automatically repair historical test tickets:
`http://localhost:8082/Corporate_Services/fix_id_tickets`