# UTM — macOS VM Path for Destructive Harness Tests

UTM is the cross-architecture alternative to Tart. Use it if you prefer a GUI-based VM manager, are on an Intel Mac, or do not have a Tart-compatible image available. The destructive and chaos specs in `tests/07_destructive_vm/` and `tests/08_chaos/` can run inside either a UTM or a Tart VM.

---

## Why a VM?

The destructive specs intentionally crash Cursor, fill the disk, or issue kill signals. Running them on your development machine risks corrupting Cursor's user data, interfering with running work, or leaving the system in an unclean state. An expendable macOS VM absorbs all of that. When the test run is over, you restore a clean snapshot and the host machine is untouched.

---

## Prerequisites

1. **UTM** — download from [mac.getutm.app](https://mac.getutm.app) (free) or the Mac App Store.
2. **macOS IPSW image** — download the Restore Image (`.ipsw`) for macOS 14 Sonoma or macOS 15 Sequoia from Apple's software catalog. UTM uses IPSW to install macOS on Apple Silicon; on Intel you would use an ISO instead.
   - Apple's IPSW catalog: `https://ipsw.me/` (third-party aggregator)
   - Or from System Settings → Software Update on a Mac running the target OS.
3. **Disk space** — allocate at least 80 GB to the VM virtual disk to accommodate macOS, Homebrew, Node, and Cursor.

---

## Step 1 — Create the VM

1. Open UTM and click **+** → **Virtualize**.
2. Select **macOS 12+** as the operating system.
3. Click **Browse** and select your downloaded `.ipsw` file.
4. Set memory to **8 GB** and CPU cores to **4**.
5. Set storage to **80 GB**.
6. Give the VM a name, e.g. `cursor-chaos`, and click **Save**.

---

## Step 2 — Install macOS

1. Click **▶ Run** to start the VM.
2. macOS Recovery will launch and install the OS from the IPSW. This takes 15–25 minutes.
3. Complete Setup Assistant: create a local admin user, skip iCloud sign-in.
4. After the desktop appears, shut down the VM (**Apple menu → Shut Down**).
5. Take a **clean snapshot** in UTM (right-click the VM → **Take Snapshot**, name it `clean-install`).

---

## Step 3 — Install Dependencies Inside the VM

Start the VM and open Terminal inside the guest.

```bash
# Install Homebrew
NONINTERACTIVE=1 /bin/bash -c \
  "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
eval "$(/opt/homebrew/bin/brew shellenv)"

# Install Node 22 LTS
brew install node@22
brew link node@22 --force --overwrite

# Install Cursor
curl -fsSL "https://downloader.cursor.sh/mac/installer/arm64" -o /tmp/cursor.dmg
hdiutil attach /tmp/cursor.dmg -quiet -mountpoint /Volumes/Cursor
cp -R /Volumes/Cursor/Cursor.app /Applications/
hdiutil detach /Volumes/Cursor -quiet
rm /tmp/cursor.dmg

# Verify
node --version   # should print v22.x.x
ls /Applications/Cursor.app  # should exist
```

After installation completes, shut down the VM again and take another snapshot: name it `provisioned`.

---

## Step 4 — Set Up a Shared Folder

UTM supports VirtFS directory sharing so the host harness directory is accessible inside the VM without copying files.

1. In UTM, select the VM → **Edit** → **Sharing** → **New Shared Directory**.
2. Set the host path to the absolute path of `worktrees/harness/` on your Mac.
3. Set the guest tag to `harness`.
4. Inside the VM, mount it:

```bash
# Inside the VM (one-time setup)
sudo mkdir -p /mnt/harness
echo 'harness /mnt/harness 9p trans=virtio,version=9p2000.L,rw 0 0' \
  | sudo tee -a /etc/fstab
sudo mount -a
```

Verify: `ls /mnt/harness` should list the harness files.

---

## Step 5 — Run the Destructive Test Suite

Inside the VM:

```bash
cd /mnt/harness
npm ci --silent
RUN_IN_VM=1 npx playwright test tests/07_destructive_vm/ tests/08_chaos/
```

Or run a single spec:

```bash
RUN_IN_VM=1 npx playwright test tests/07_destructive_vm/chaos_vm.spec.ts
```

The `RUN_IN_VM` guard in the spec files prevents them from executing outside the VM environment. Without it, they return `test.skip` immediately.

---

## Step 6 — Retrieve Reports

Reports are written to `reports/` inside the harness directory. Because you mounted the host harness as a shared folder (Step 4), reports written inside the VM appear directly on the host at `worktrees/harness/reports/`. No additional transfer step is needed.

---

## Step 7 — Restore the Clean Snapshot

After each test run, restore to the `provisioned` snapshot so the next run starts from a known-good state:

1. In UTM, right-click the VM → **Restore Snapshot** → select `provisioned`.
2. Start the VM for the next run.

Alternatively, restore via the UTM scripting API (macOS 14+):

```bash
# Requires UTM 4.x and the bundled helper
open -a UTM --args --restore-snapshot cursor-chaos provisioned
```

---

## Tart vs. UTM — Quick Comparison

| Feature | Tart | UTM |
|---|---|---|
| Architecture | Apple Silicon native | Apple Silicon + Intel |
| Interface | CLI only | GUI + CLI |
| Automation | `tart exec` (SSH-free) | Shared folder + manual SSH or GUI |
| Speed | Fast (Virtualization.framework) | Fast on Apple Silicon, slower on Intel |
| Snapshots | Via `tart clone` | Built-in snapshot manager |
| Cost | Free tier available | Free (open source) |
| Best for | CI / headless scripted runs | Interactive development, Intel Macs |

Use **Tart** if you want the harness scripts (`vms/tart/*.sh`) to handle everything automatically. Use **UTM** if you prefer a GUI or need Intel Mac support.

---

## Troubleshooting

**VM boots to a black screen**
Increase the display resolution in UTM settings or try toggling **Retina Mode** off.

**Shared folder not mounting**
Ensure VirtFS is enabled in UTM's **Sharing** settings. The tag must exactly match the `fstab` entry.

**Node command not found inside VM**
Run `eval "$(/opt/homebrew/bin/brew shellenv)"` or add it to `~/.zprofile`.

**`RUN_IN_VM` guard skipping tests even inside the VM**
The guard checks `process.env.RUN_IN_VM`. Export it explicitly: `export RUN_IN_VM=1` before running the suite.

**Playwright can't launch Cursor**
Ensure `/Applications/Cursor.app` exists and `CURSOR_APP_PATH` is set or defaults correctly. Run `open /Applications/Cursor.app` manually first to accept the initial macOS security prompt.
