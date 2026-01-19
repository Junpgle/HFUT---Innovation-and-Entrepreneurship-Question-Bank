import json
import os
import subprocess

# === 配置 ===
INPUT_FILE = 'users.jsonl'  # 请确保文件名正确
BATCH_SIZE = 50  # 批量更新


def run_sync():
    if not os.path.exists(INPUT_FILE):
        print(f"❌ 找不到文件 {INPUT_FILE}，请确认文件名")
        return

    print(f"🚀 开始根据 {INPUT_FILE} 同步邮箱验证状态...")

    updates = []
    total_count = 0
    valid_count = 0

    with open(INPUT_FILE, 'r', encoding='utf-8-sig') as f:
        for line in f:
            line = line.strip()
            if not line: continue

            # 🛡️ 修复点：跳过 LeanCloud 的头部定义行
            if line.startswith('#'):
                continue

            try:
                row = json.loads(line)

                # 1. 获取 LeanCloud ID
                lc_id = row.get('objectId')
                if not lc_id: continue

                # 2. 获取原始验证状态
                # 注意：LeanCloud 导出数据中，emailVerified 可能是 true/false，也可能不存在
                is_verified_bool = row.get('emailVerified', False)
                is_verified_int = 1 if is_verified_bool else 0

                # 3. 生成 SQL
                # 仅更新 leancloud_id 匹配的用户
                sql = f"UPDATE Users SET email_verified = {is_verified_int} WHERE leancloud_id = '{lc_id}';"

                updates.append(sql)
                valid_count += 1

                if len(updates) >= BATCH_SIZE:
                    send_batch(updates)
                    total_count += len(updates)
                    updates = []

            except json.JSONDecodeError:
                print(f"⚠️ 跳过无效 JSON 行: {line[:30]}...")
            except Exception as e:
                print(f"⚠️ 其他错误: {e}")

    # 处理剩余的
    if updates:
        send_batch(updates)
        total_count += len(updates)

    print(f"\n🎉 同步完成！解析了 {valid_count} 条数据，更新请求已发送。")


def send_batch(sqls):
    temp_file = "temp_fix_users.sql"
    with open(temp_file, 'w', encoding='utf-8') as f:
        f.write("\n".join(sqls))

    print(f"🔄 更新 {len(sqls)} 个用户... ", end="")

    try:
        # 使用 D1 远程执行
        subprocess.run(
            f"npx wrangler d1 execute hfut-db --remote --file={temp_file}",
            shell=True,
            capture_output=True,
            encoding='utf-8'
        )
        print("✅")
    except Exception as e:
        print(f"❌ {e}")

    if os.path.exists(temp_file):
        try:
            os.remove(temp_file)
        except:
            pass


if __name__ == '__main__':
    run_sync()