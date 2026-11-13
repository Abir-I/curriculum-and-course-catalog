# Red-Green ফলাফল: Sprint 1 থেকে 4

পদ্ধতি: প্রতিটি feature-এর test একবার red commit-এ চালানো হয়েছে (code নেই, ফেল করার কথা) এবং একবার green commit-এ (code আছে, পাস করার কথা)। প্রতিটি চালানো হয়েছে আলাদা `git worktree`-এ, মূল branch অপরিবর্তিত রেখে। ফলাফল চালানো হয়েছে লেখকের নিজের Windows laptop-এ, Vitest 5.1.0 ও PostgreSQL 16 দিয়ে।

| Sprint | Feature | Requirement / Test ID | Red commit | Red ফল | Green commit | Green ফল |
|---|---|---|---|---|---|---|
| 1 | Academic unit | FR-02; M2TC-004–008 | 5d80c4d | Cannot find module (ফেল) | 7b23bf9 | 5 passed |
| 1 | Academic stage | FR-03; M2TC-009–012 | 5d80c4d | Cannot find module (ফেল) | 76148f2 | 4 passed |
| 2 | Rooms | FR-40; M2TC-087–089 | 2fc008b | 3 passed (ব্যতিক্রম E2) | 6423660 | ফাইল নেই এই commit-এ |
| 2 | Degree plan and versions | FR-15, FR-20; M2TC-093, 094 | 2fc008b | Cannot find module (ফেল) | 6ce952d | 2 passed |
| 2 | Audit reader | FR-48; M2TC-096, 097 | 2fc008b | queryAudit is not a function (ফেল) | 31589fb | 2 passed |
| 2 | Groups and prerequisites | FR-16, FR-18, FR-23, FR-26, FR-27; M2TC-090–092, 099 | 4254921 | 4 failed (ফেল) | 32bfcc0 | 4 passed |
| 2 | Offering | FR-10; M2TC-105 | 4254921 | Cannot find module (ফেল) | 32bfcc0 | 1 passed |
| 3 | Policy resolution | FR-35, FR-36; M2TC-109 | f399565 | 3 failed (ফেল) | 8de75cf | 3 passed |
| 3 | Section capacity | FR-39; M2TC-106–108 | 735b2a3 | Cannot find module (ফেল) | 4524cf4 | 4 passed |
| 3 | Eligibility | FR-28, FR-31, FR-32; M2TC-100–103 | 26fd1d0 | Cannot find module (ফেল) | 626009c | 4 passed |
| 3 | Progression | FR-45, FR-46; M2TC-110, 111 | 3152819 | Cannot find module (ফেল) | 0e47ad0 | 3 passed |
| 3 | Group completion | FR-19; M2TC-112 | d4d7677 | 2 failed (ফেল) | 5566ee0 | 2 passed |
| 3 | Prerequisite cycle | FR-23, FR-26; M2TC-113 | a4230fd | test code service-এর পরে (ব্যতিক্রম E1) | a4230fd | (একই commit) |
| 4 | Study plan | FR-21; S4-02 | 8ae7b60 | Cannot find module (ফেল) | 167fd84 | 2 passed |

## ব্যতিক্রম (রিপোর্টে স্বীকার করতে হবে)
- **E2, Rooms (`2fc008b`):** test পাস করেছে কারণ rooms-এর service code `6423660`-এ আগেই ছিল। সুতরাং এই feature-এর জন্য সত্যিকার red-first হয়নি।
- **E1, Prerequisite cycle (M2TC-113) ও offering M2TC-104 (`a4230fd`):** test code service code লেখার পরে যোগ হয়েছে। Commit message-এ এটি স্বীকার করা আছে।

## পরিসংখ্যান
- ১৪টি feature-এর মধ্যে ১২টিতে red-green জোড়া চালানো হয়েছে।
- ১০টি জোড়া সম্পূর্ণ red-first ও green (ফেল ও পাস দুটোই দেখা গেছে)।
- ২টি ব্যতিক্রম (E1, E2), উপরে বর্ণিত।

## কীভাবে পুনরায় যাচাই করবেন
প্রতিটি লাইনের জন্য:
```
git worktree add /tmp/w <commit>
cd /tmp/w && npx vitest run <test-file>
git worktree remove --force /tmp/w
```
Red দেখতে `<red commit>`, green দেখতে `<green commit>` ব্যবহার করুন।
