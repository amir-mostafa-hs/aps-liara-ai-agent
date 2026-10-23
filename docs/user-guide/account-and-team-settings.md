# User Guide: Account & Team Settings

## 1. Accessing Account Settings

Open the **Sidecar Console** on the left and select the **«تنظیمات اکانت»** tab (marked with a key icon `KeyRound`).

## 2. Managing the Liara API Token

1. **Viewing Token Status:**
   - If configured, a green badge displays **«توکن فعال»**, and the stored token is safely displayed in masked format (e.g. `••••••••C9VI`).
   - If missing, an amber badge displays **«توکن تنظیم نشده»**.
2. **Entering or Updating a Token:**
   - Type or paste the new token in the input box (`مثال: lia_...`).
   - Click the eye icon (`Eye` / `EyeOff`) to toggle plain-text visibility for verification.
   - Use the direct link **«دریافت کلید دسترسی»** (`https://console.liara.ir/API`) to obtain an API key directly from your Liara console.
3. **Saving Changes:**
   - Click **«ذخیره تغییرات»**. The token is securely written to your user profile in the PostgreSQL database and immediately activates in the agent session.

## 3. Team Workspace Management

Liara supports collaboration workspaces (Teams). The agent enables switching between personal accounts and team scopes:

1. **Testing Connection & Discovering Teams:**
   - Click **«بررسی اتصال»**.
   - The agent connects to `https://api.iran.liara.ir/v2/teams` and populates the **«انتخاب از تیم‌های اکانت»** dropdown.
2. **Selecting a Team:**
   - Choose a team from the dropdown (e.g. `لیارا (6ace4ec3ec13fe0c3c19c4db)`), or enter a custom `Team ID` manually.
   - To return to your personal account, choose **«حساب شخصی (بدون تیم)»** or leave the field blank.
3. **Saving Team Changes:**
   - Click **«ذخیره تغییرات»**. All subsequent project listings, database provisioning calls, and deployments will automatically be scoped to that team (`?teamID=...`).
