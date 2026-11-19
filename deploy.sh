#!/usr/bin/env bash
# ==============================================================================
#  MDCGS 一键部署脚本（文件名随意，如 mdcgs-deploy.sh）
#
#  用法（只有这一种）：
#      ./mdcgs-deploy.sh
#
#  首次执行建议用 root 或 sudo，脚本会在需要时写入 /etc/docker 并重启 Docker。
#
#  流程：
#    第 0 步  拉取仓库到脚本同级目录（已存在则检查是否有更新，不是最新就更新）
#    第 1 步  检查环境（Docker / Compose / CPU 架构 / 端口 / 磁盘）
#    第 2 步  检查离线安装包是否存在且完整（只检查，不生成）
#    第 3 步  网络检查：实际拉取测试镜像；失败则依次尝试
#              ① 写入镜像加速源  ② 为 Docker 配置 HTTP(S) 代理  ③ 回退离线包
#    第 4 步  启动服务并做健康检查（本地已有部署版本镜像时跳过拉取）
#    第 5 步  结果汇总，提醒完善 .env 并给出重启命令
# ==============================================================================

set -uo pipefail

REPO_URL="https://github.com/HaoY-l/mdcgs.git"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 脚本同级目录：优先用脚本所在目录（如果它本身就是仓库），否则用 脚本目录/mdcgs
if [ -f "$SCRIPT_DIR/docker-compose.yml" ] && [ -d "$SCRIPT_DIR/.git" ]; then
  PROJECT_DIR="$SCRIPT_DIR"
else
  PROJECT_DIR="$SCRIPT_DIR/mdcgs"
fi

COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
ENV_FILE="$PROJECT_DIR/.env"
ENV_EXAMPLE="$PROJECT_DIR/.env-example"

# ------------------------------ 输出 ----------------------------------------
if [ -t 1 ]; then
  C_RED=$'\033[31m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'
  C_CYAN=$'\033[36m'; C_BOLD=$'\033[1m'; C_RESET=$'\033[0m'
else
  C_RED=""; C_GREEN=""; C_YELLOW=""; C_CYAN=""; C_BOLD=""; C_RESET=""
fi
info() { printf '%s[INFO]%s  %s\n'  "$C_GREEN"  "$C_RESET" "$*"; }
warn() { printf '%s[WARN]%s  %s\n'  "$C_YELLOW" "$C_RESET" "$*"; }
err()  { printf '%s[ERROR]%s %s\n'  "$C_RED"    "$C_RESET" "$*" >&2; }
ok()   { printf '%s[ OK ]%s  %s\n'  "$C_GREEN"  "$C_RESET" "$*"; }
step() { printf '\n%s%s==== %s ====%s\n' "$C_BOLD" "$C_CYAN" "$*" "$C_RESET"; }
die()  { err "$*"; exit 1; }

# ==============================================================================
# 第 0 步：拉取仓库（版本以仓库内 docker-compose.yml 为准）
# ==============================================================================
GIT_MIRRORS=(
  "https://ghfast.top/https://github.com/HaoY-l/mdcgs.git"
  "https://gh-proxy.com/https://github.com/HaoY-l/mdcgs.git"
  "https://ghproxy.net/https://github.com/HaoY-l/mdcgs.git"
)

# 带超时的 git 命令，避免网络不通时长时间卡住
git_run() {
  if command -v timeout >/dev/null 2>&1; then
    timeout 90 git "$@"
  else
    git "$@"
  fi
}

clone_repo() {
  local url="$1" tmp_dir
  tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/mdcgs-clone.XXXXXX")"
  info "尝试克隆：${url}"
  if git_run clone --depth 1 "$url" "$tmp_dir/repo" >/dev/null 2>&1; then
    if [ -d "$PROJECT_DIR" ] && [ -n "$(ls -A "$PROJECT_DIR" 2>/dev/null)" ]; then
      warn "目标目录非空且不是有效仓库，无法写入：$PROJECT_DIR"
      rm -rf "$tmp_dir"
      return 1
    fi
    mkdir -p "$PROJECT_DIR"
    # 先移除空目录，避免 mv 嵌套成 repo/repo
    rmdir "$PROJECT_DIR" 2>/dev/null || true
    mv "$tmp_dir/repo" "$PROJECT_DIR" || { rm -rf "$tmp_dir"; return 1; }
    rm -rf "$tmp_dir"
    return 0
  fi
  rm -rf "$tmp_dir"
  return 1
}

fetch_repo() {
  step "第 0 步：拉取仓库"

  if [ -f "$COMPOSE_FILE" ]; then
    ok "仓库已存在：$PROJECT_DIR"

    if [ -d "$PROJECT_DIR/.git" ]; then
      command -v git >/dev/null 2>&1 || die "未安装 git，无法更新仓库"

      # 校验 remote 是否是本项目，避免更新到别的仓库
      local remote_url
      remote_url="$(git -C "$PROJECT_DIR" remote get-url origin 2>/dev/null || true)"
      if [ -z "$remote_url" ]; then
        warn "仓库未配置 origin，跳过更新，继续使用当前代码"
        return 0
      fi
      if [[ "$remote_url" != *HaoY-l/mdcgs* ]]; then
        warn "origin 不是本项目：${remote_url}，跳过更新，继续使用当前代码"
        return 0
      fi

      local before after
      before="$(git -C "$PROJECT_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)"
      info "当前提交：${before}，检查是否有更新..."

      if git_run -C "$PROJECT_DIR" pull --ff-only >/dev/null 2>&1; then
        after="$(git -C "$PROJECT_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)"
        if [ "$before" = "$after" ]; then
          ok "仓库已是最新：${after} $(git -C "$PROJECT_DIR" log -1 --pretty='%s' 2>/dev/null)"
        else
          ok "仓库已更新：${before} → ${after}"
          info "  $(git -C "$PROJECT_DIR" log -1 --pretty='%s' 2>/dev/null)"
        fi
      else
        warn "git pull 失败（网络不通或本地有改动），继续使用当前代码：${before}"
      fi
    else
      info "目录存在但不是 git 仓库（离线拷贝），跳过更新"
    fi
    return 0
  fi

  command -v git >/dev/null 2>&1 || die "未安装 git，无法拉取仓库
      离线环境请手动把仓库目录拷贝到：$PROJECT_DIR"

  # 1) 官方源
  if clone_repo "$REPO_URL"; then
    ok "已克隆：$(git -C "$PROJECT_DIR" log -1 --pretty='%h %s' 2>/dev/null)"
    [ -f "$COMPOSE_FILE" ] || die "克隆完成但未找到 docker-compose.yml：$COMPOSE_FILE"
    return 0
  fi
  warn "直连 github.com 失败，尝试镜像代理"

  # 2) GitHub 加速代理
  local mirror
  for mirror in "${GIT_MIRRORS[@]}"; do
    if clone_repo "$mirror"; then
      ok "已通过镜像克隆成功"
      [ -f "$COMPOSE_FILE" ] || die "克隆完成但未找到 docker-compose.yml：$COMPOSE_FILE"
      return 0
    fi
  done

  # 3) 全部失败 -> 给出可执行的离线处理指引
  err "所有克隆地址均失败，无法获取代码。"
  cat <<EOF

  可任选一种方式处理后重新执行本脚本：

  方式一：手动上传代码（离线环境）
      在本机打包仓库（排除 node_modules 等，仓库已带 .gitignore）：
          tar -czf mdcgs.tar.gz mdcgs
      上传到服务器后解压到目标目录：
          tar -xzf mdcgs.tar.gz -C /root
          # 确保得到 /root/mdcgs/docker-compose.yml

  方式二：在服务器上具备网络时换用加速地址
          git clone --depth 1 https://ghfast.top/https://github.com/HaoY-l/mdcgs.git /root/mdcgs

  当前期望目录：$PROJECT_DIR
EOF
  exit 1
}

# ==============================================================================
# 第 1 步：环境检查
# ==============================================================================
DC=()
APP_VERSION=""
FRONT_IMAGE=""
BACK_IMAGE=""
FRONT_PORT="7785"
BACK_PORT="8000"
NEED_ENV_SETUP=0

port_pid() {
  local p="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$p" -sTCP:LISTEN -t 2>/dev/null | head -1
  elif command -v ss >/dev/null 2>&1; then
    ss -lntp 2>/dev/null | awk -v port=":$p" '$4 ~ port {print; exit}' \
      | grep -oE 'pid=[0-9]+' | cut -d= -f2 | head -1
  fi
}

check_environment() {
  step "第 1 步：环境检查"

  # --- CPU 架构（镜像仅提供 linux/amd64）---
  local arch
  arch="$(uname -m)"
  case "$arch" in
    x86_64|amd64)
      ok "CPU 架构：${arch}（amd64）" ;;
    aarch64|arm64|armv7l|armv8l)
      err "当前 CPU 架构为 ${arch}，但 MDCGS 镜像只提供 linux/amd64 版本，无法直接部署。"
      err "请换用 x86_64（amd64）服务器；若确需在 ARM 上运行，需自行启用 qemu 模拟并手动部署，本脚本不处理。"
      exit 1 ;;
    *)
      warn "CPU 架构：${arch}（非 amd64，镜像可能无法运行）" ;;
  esac

  # --- docker ---
  command -v docker >/dev/null 2>&1 || die "未安装 Docker（要求 >= 20.10）"
  local docker_ver
  docker_ver="$(docker version --format '{{.Server.Version}}' 2>/dev/null || true)"
  [ -n "$docker_ver" ] || die "Docker 守护进程未运行或无权限访问
      启动：sudo systemctl start docker
      授权：sudo usermod -aG docker \$USER && newgrp docker"
  ok "Docker：${docker_ver}"

  # --- compose ---
  if docker compose version >/dev/null 2>&1; then
    DC=(docker compose)
    ok "Compose：$(docker compose version --short 2>/dev/null || echo ok)"
  elif command -v docker-compose >/dev/null 2>&1; then
    DC=(docker-compose)
    ok "Compose：$(docker-compose version --short 2>/dev/null || echo ok)"
  else
    die "未安装 Docker Compose（要求 >= 2.0）"
  fi

  # --- 版本：直接取仓库 docker-compose.yml，即仓库最新版本 ---
  APP_VERSION="$(grep -oE 'monday1/mdcgs-backend:v[0-9]+\.[0-9]+\.[0-9]+' "$COMPOSE_FILE" | head -1 | sed 's/.*://')"
  [ -n "$APP_VERSION" ] || APP_VERSION="$(grep -oE 'monday1/mdcgs-frontend:v[0-9]+\.[0-9]+\.[0-9]+' "$COMPOSE_FILE" | head -1 | sed 's/.*://')"
  [ -n "$APP_VERSION" ] || die "无法从 docker-compose.yml 读取版本号"
  FRONT_IMAGE="monday1/mdcgs-frontend:${APP_VERSION}"
  BACK_IMAGE="monday1/mdcgs-backend:${APP_VERSION}"
  ok "部署版本：${APP_VERSION}（取自仓库 docker-compose.yml）"

  # --- 端口 ---
  FRONT_PORT="$(grep -A3 -E '^[[:space:]]*frontend:' "$COMPOSE_FILE" | grep -oE '"[0-9]+:80"' | head -1 | cut -d'"' -f2 | cut -d: -f1)"
  BACK_PORT="$(grep -A8 -E '^[[:space:]]*backend:' "$COMPOSE_FILE" | grep -oE '"[0-9]+:8000"' | head -1 | cut -d'"' -f2 | cut -d: -f1)"
  FRONT_PORT="${FRONT_PORT:-7785}"
  BACK_PORT="${BACK_PORT:-8000}"

  local p occupant
  for p in "$FRONT_PORT" "$BACK_PORT"; do
    occupant="$(port_pid "$p")"
    if [ -z "$occupant" ]; then
      ok "端口 ${p} 可用"
    elif docker ps --format '{{.Names}}' 2>/dev/null | grep -qE '^mdcgs-(frontend|backend)$'; then
      info "端口 ${p} 被现有 mdcgs 容器占用，将原地升级"
    else
      die "端口 ${p} 已被占用（PID: ${occupant}）
      排查：ss -lntp | grep :${p}   或   lsof -i :${p}"
    fi
  done

  # --- 磁盘 ---
  local avail_gb
  avail_gb=$(( $(df -Pk "$PROJECT_DIR" | awk 'NR==2 {print $4}') / 1024 / 1024 ))
  [ "$avail_gb" -ge 5 ] && ok "磁盘可用：${avail_gb}GB" || warn "磁盘仅剩 ${avail_gb}GB，建议 >= 5GB"
}

# ==============================================================================
# 第 2 步：检查离线包（只检查，不生成）
# ==============================================================================
HAVE_OFFLINE=0
LOCAL_IMAGES_READY=0
OFFLINE_FRONT=""
OFFLINE_BACK=""

image_exists() { docker image inspect "$1" >/dev/null 2>&1; }

find_archive() {
  local name="$1" d f
  for d in "$PROJECT_DIR/offline" "$PROJECT_DIR" "$SCRIPT_DIR" "$PWD"; do
    [ -d "$d" ] || continue
    for f in "$d/${name}.tar.gz" "$d/${name}.tgz" "$d/${name}.tar"; do
      if [ -f "$f" ]; then printf '%s\n' "$f"; return 0; fi
    done
  done
  return 1
}

verify_archive() {
  local f="$1" label="$2" size_mb
  [ -s "$f" ] || { warn "${label}离线包为空：$f"; return 1; }
  case "$f" in
    *.tar.gz|*.tgz)
      if command -v gzip >/dev/null 2>&1; then
        gzip -t "$f" 2>/dev/null || { warn "${label}离线包损坏或未下载完整：$f"; return 1; }
      fi ;;
  esac
  size_mb=$(( $(wc -c < "$f") / 1024 / 1024 ))
  ok "${label}离线包：${f}（${size_mb}MB）"
  return 0
}

check_offline_packages() {
  step "第 2 步：检查离线安装包（版本 ${APP_VERSION}）"

  local missing=0
  OFFLINE_FRONT="$(find_archive "mdcgs-frontend-${APP_VERSION}" || true)"
  OFFLINE_BACK="$(find_archive "mdcgs-backend-${APP_VERSION}" || true)"

  if [ -n "$OFFLINE_FRONT" ]; then
    verify_archive "$OFFLINE_FRONT" "前端" || missing=1
  else
    warn "未找到前端离线包：mdcgs-frontend-${APP_VERSION}.tar.gz"
    missing=1
  fi
  if [ -n "$OFFLINE_BACK" ]; then
    verify_archive "$OFFLINE_BACK" "后端" || missing=1
  else
    warn "未找到后端离线包：mdcgs-backend-${APP_VERSION}.tar.gz"
    missing=1
  fi

  if [ "$missing" -eq 0 ]; then
    HAVE_OFFLINE=1
    ok "离线包齐全"
  else
    HAVE_OFFLINE=0
    info "离线包不齐全，不影响在线部署（可放到 ${PROJECT_DIR}/offline/）"
  fi

  local n=0
  image_exists "$FRONT_IMAGE" && n=$((n+1))
  image_exists "$BACK_IMAGE" && n=$((n+1))
  LOCAL_IMAGES_READY=0
  case "$n" in
    2) LOCAL_IMAGES_READY=1; ok "本地已存在 ${APP_VERSION} 镜像（无需重新拉取）" ;;
    1) warn "本地只存在部分 ${APP_VERSION} 镜像" ;;
    *) info "本地暂无 ${APP_VERSION} 镜像" ;;
  esac

  # 本地残留的其它版本镜像，提示可能占用磁盘
  local others
  others="$(docker images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null \
            | grep -E '^monday1/mdcgs-(frontend|backend):' \
            | grep -v ":${APP_VERSION}$" | sort -u || true)"
  if [ -n "$others" ]; then
    warn "本地还存在其它版本的 MDCGS 镜像（当前部署版本为 ${APP_VERSION}）："
    printf '        %s\n' $others
    info "如需清理：docker rmi <镜像名>"
  fi
}

# ==============================================================================
# 第 3 步：网络检查（能否拉取镜像，不能则配置镜像加速）
# ==============================================================================
NETWORK_OK=0
MIRROR_APPLIED=0

DOCKER_MIRRORS_JSON='[
      "https://docker.xuanyuan.me",
      "https://docker.1ms.run",
      "https://docker.m.daocloud.io",
      "https://docker.1panel.live",
      "https://docker.hlmirror.com",
      "https://hub.rat.dev",
      "https://docker.mirrors.ustc.edu.cn",
      "https://docker-0.unsee.tech"
    ]'

# 探测能否真正从 Docker Hub 拉到镜像（daemon.json 里的 mirror 对 manifest 查询不生效）
docker_hub_pullable() {
  local probe="hello-world:latest"
  if image_exists "$probe"; then return 0; fi
  if command -v timeout >/dev/null 2>&1; then
    timeout 90 docker pull -q "$probe" >/dev/null 2>&1 || return 1
  else
    docker pull -q "$probe" >/dev/null 2>&1 || return 1
  fi
  docker rmi "$probe" >/dev/null 2>&1 || true
  return 0
}

enable_docker_proxy() {
  command -v systemctl >/dev/null 2>&1 || return 1
  command -v curl >/dev/null 2>&1 || return 1

  local proxy="${HTTPS_PROXY:-${https_proxy:-}}" sudo_cmd=""
  [ "$(id -u)" -eq 0 ] || sudo_cmd="sudo"

  if [ -z "$proxy" ]; then
    # 未提供代理：询问是否使用 git 当前生效的代理（常见于 Clash / v2ray 本地端口）
    local git_proxy
    git_proxy="$(git config --global --get https.proxy 2>/dev/null || true)"
    [ -n "$git_proxy" ] && proxy="$git_proxy"
  fi

  if [ -z "$proxy" ]; then
    warn "未检测到可用的 HTTP 代理（HTTPS_PROXY / git https.proxy）"
    warn "如有代理，请显式指定后重新执行，例如：
      sudo HTTPS_PROXY=http://127.0.0.1:7890 ./mdcgs-deploy.sh"
    return 1
  fi

  warn "Docker 拉取镜像不走系统代理，将为其单独配置：${proxy}"
  $sudo_cmd mkdir -p /etc/systemd/system/docker.service.d || return 1
  $sudo_cmd tee /etc/systemd/system/docker.service.d/http-proxy.conf >/dev/null <<EOF || return 1
[Service]
Environment="HTTP_PROXY=${proxy}"
Environment="HTTPS_PROXY=${proxy}"
Environment="NO_PROXY=localhost,127.0.0.1,docker.xuanyuan.me,docker.1ms.run,docker.m.daocloud.io,docker.1panel.live,docker.hlmirror.com,hub.rat.dev"
EOF
  ok "已写入 /etc/systemd/system/docker.service.d/http-proxy.conf"

  $sudo_cmd systemctl daemon-reload || true
  $sudo_cmd systemctl restart docker || return 1

  local i
  for i in $(seq 1 30); do
    docker info >/dev/null 2>&1 && break
    [ "$i" -eq 30 ] && return 1
    sleep 2
  done
  ok "Docker 已重启并就绪（已启用代理）"

  info "验证能否拉取镜像..."
  if docker_hub_pullable; then
    ok "代理生效，可正常拉取镜像"
    return 0
  fi
  warn "配置代理后仍无法拉取镜像"
  return 1
}

configure_docker_mirrors() {
  if ! command -v systemctl >/dev/null 2>&1; then
    warn "当前系统没有 systemd（如 macOS / Docker Desktop），无法自动配置镜像加速"
    warn "请手动在 Docker 设置 → Docker Engine 的 daemon.json 中加入 registry-mirrors 后重试"
    return 1
  fi

  local daemon_file="/etc/docker/daemon.json" sudo_cmd=""
  [ "$(id -u)" -eq 0 ] || sudo_cmd="sudo"

  warn "将写入 ${daemon_file} 并重启 Docker 守护进程（运行中的容器会短暂中断）"
  $sudo_cmd mkdir -p /etc/docker || return 1

  # 备份已有配置
  if $sudo_cmd test -s "$daemon_file"; then
    local backup="${daemon_file}.bak.$(date +%Y%m%d%H%M%S)"
    $sudo_cmd cp "$daemon_file" "$backup" && info "已备份原配置：${backup}"
  fi

  # 有 python3 就合并（保留其它配置项），否则直接写入
  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$DOCKER_MIRRORS_JSON" | $sudo_cmd python3 -c '
import json, sys, os
path = "/etc/docker/daemon.json"
mirrors = json.load(sys.stdin)
data = {}
if os.path.exists(path):
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f) or {}
    except Exception:
        data = {}
data["registry-mirrors"] = mirrors
with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
' || { err "写入 ${daemon_file} 失败"; return 1; }
  else
    $sudo_cmd tee "$daemon_file" >/dev/null <<EOF || { err "写入 ${daemon_file} 失败"; return 1; }
{
  "registry-mirrors": ${DOCKER_MIRRORS_JSON}
}
EOF
  fi
  ok "镜像加速配置已写入"

  info "重启 Docker 守护进程..."
  $sudo_cmd systemctl daemon-reload || true
  if ! $sudo_cmd systemctl restart docker; then
    $sudo_cmd service docker restart || { err "重启 Docker 失败，请手动执行：sudo systemctl restart docker"; return 1; }
  fi

  local i
  for i in $(seq 1 30); do
    docker info >/dev/null 2>&1 && break
    [ "$i" -eq 30 ] && { err "Docker 重启后未能就绪，请检查：systemctl status docker"; return 1; }
    sleep 2
  done
  ok "Docker 已重启并就绪"
  MIRROR_APPLIED=1
  return 0
}

check_network() {
  step "第 3 步：网络检查（能否拉取镜像）"

  local daemon_file="/etc/docker/daemon.json" sudo_cmd=""
  [ "$(id -u)" -eq 0 ] || sudo_cmd="sudo"

  # 1) 镜像加速未配置 -> 直接写入下面的 mirror 列表并重启 Docker
  if ! $sudo_cmd test -f "$daemon_file" 2>/dev/null \
     || ! $sudo_cmd grep -q 'registry-mirrors' "$daemon_file" 2>/dev/null; then
    warn "未检测到 Docker 镜像加速配置，写入以下镜像源："
    printf '%s\n' "$DOCKER_MIRRORS_JSON"
    if configure_docker_mirrors; then
      info "验证能否拉取镜像（hello-world 测试）..."
      if docker_hub_pullable; then
        NETWORK_OK=1
        ok "镜像加速生效，可正常拉取镜像"
        return 0
      fi
      warn "配置镜像加速后仍无法拉取镜像"
    fi
  else
    ok "已配置镜像加速：$( $sudo_cmd grep -oE 'https://[^"]+' "$daemon_file" 2>/dev/null | tr '\n' ' ')"
    info "验证能否拉取镜像（hello-world 测试）..."
    if docker_hub_pullable; then
      NETWORK_OK=1
      ok "镜像源可用，可正常拉取镜像"
      return 0
    fi
    warn "现有镜像源拉取失败"
  fi

  # 2) 拉取仍失败：尝试为 Docker 配置 HTTP(S) 代理
  if command -v curl >/dev/null 2>&1 \
     && curl -s -o /dev/null --max-time 10 https://github.com 2>/dev/null; then
    warn "检测到 git/GitHub 可访问，尝试为 Docker 守护进程配置代理"
    if enable_docker_proxy; then
      NETWORK_OK=1
      return 0
    fi
  fi

  NETWORK_OK=0
  warn "网络不可用，将跳过在线拉取，使用本地镜像或离线安装包"
  return 1
}

# ==============================================================================
# 配置文件 .env
# ==============================================================================
compose() { "${DC[@]}" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

prepare_env() {
  step "检查配置文件 .env"

  if [ -f "$ENV_FILE" ]; then
    ok "已存在：$ENV_FILE"
    return 0
  fi

  [ -f "$ENV_EXAMPLE" ] || die "缺少 .env 且没有 .env-example，无法继续"
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  NEED_ENV_SETUP=1
  warn "未找到 .env，已从 .env-example 生成一份模板：$ENV_FILE"
}

# ==============================================================================
# 第 4 步：部署（在线优先，失败回退离线）
# ==============================================================================
DEPLOY_VIA=""

deploy_online() {
  info "在线拉取镜像：${FRONT_IMAGE}、${BACK_IMAGE}"
  if ! compose pull --quiet >/dev/null 2>&1; then
    # 部分老版本 compose 不支持 pull --quiet
    compose pull || true
  fi
  if image_exists "$FRONT_IMAGE" && image_exists "$BACK_IMAGE"; then
    DEPLOY_VIA="在线拉取"
    return 0
  fi
  warn "在线拉取失败或镜像不完整"
  return 1
}

load_archive() {
  local archive="$1" image="$2" label="$3"
  info "加载${label}镜像：$(basename "$archive")"
  if image_exists "$image"; then
    info "  本地已有 ${image}，跳过"
    return 0
  fi
  case "$archive" in
    *.tar.gz|*.tgz) gunzip -c "$archive" | docker load ;;
    *)              docker load -i "$archive" ;;
  esac || return 1
  image_exists "$image" || { err "加载后未找到镜像 ${image}（包内 tag 与版本不一致？）"; return 1; }
  ok "${label}镜像就绪：${image}"
}

deploy_offline() {
  [ "$HAVE_OFFLINE" -eq 1 ] || { err "离线包不完整，无法离线部署"; return 1; }
  load_archive "$OFFLINE_FRONT" "$FRONT_IMAGE" "前端" || return 1
  load_archive "$OFFLINE_BACK"  "$BACK_IMAGE"  "后端" || return 1
  DEPLOY_VIA="离线安装包"
  return 0
}

start_services() {
  step "第 4 步：启动服务（${DEPLOY_VIA}）"
  compose up -d --remove-orphans || die "启动失败，查看日志：
      cd $PROJECT_DIR && ${DC[*]} logs"
  ok "容器已启动"
}

wait_health() {
  step "第 5 步：健康检查"

  if [ "$NEED_ENV_SETUP" -eq 1 ]; then
    warn ".env 还是模板，数据库/Redis 未配置，跳过健康检查"
    return 0
  fi
  if ! command -v curl >/dev/null 2>&1; then
    warn "未安装 curl，跳过健康检查"
    return 0
  fi

  local url="http://127.0.0.1:${BACK_PORT}/api/v1/health" i resp
  info "等待后端就绪：$url"
  for i in $(seq 1 60); do
    resp="$(curl -fsS --max-time 3 "$url" 2>/dev/null || true)"
    if printf '%s' "$resp" | grep -q '"healthy"'; then
      ok "后端健康：$resp"
      break
    fi
    if [ "$i" -eq 60 ]; then
      compose logs --tail=50 backend 2>/dev/null || true
      err "后端 3 分钟内未就绪，常见原因：.env 中数据库 / Redis 地址或密码错误"
      return 1
    fi
    sleep 3
  done

  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:${FRONT_PORT}/" || true)"
  if [ "$code" = "200" ]; then
    ok "前端可访问（HTTP ${code}）"
  else
    warn "前端返回 HTTP ${code:-000}，请检查日志：${DC[*]} logs frontend"
  fi
}

# ==============================================================================
# 第 5 步：结果汇总与后续提醒
# ==============================================================================
summary() {
  cat <<EOF

${C_BOLD}${C_GREEN}================ 部署完成 ================${C_RESET}

  代码目录 : $PROJECT_DIR
  部署方式 : $DEPLOY_VIA
  应用版本 : $APP_VERSION
  前端地址 : http://<服务器IP>:${FRONT_PORT}
  后端地址 : http://<服务器IP>:${BACK_PORT}   （接口文档 /docs）
EOF

  if [ "$MIRROR_APPLIED" -eq 1 ]; then
    cat <<EOF

  已为本机 Docker 配置镜像加速（/etc/docker/daemon.json），原配置已备份。
  如不需要，可从备份恢复后重启 Docker：
      ls /etc/docker/daemon.json.bak.*
EOF
  fi

  if [ "$NEED_ENV_SETUP" -eq 1 ]; then
    cat <<EOF

${C_YELLOW}${C_BOLD}⚠  请先完善 .env 配置文件${C_RESET}

  文件位置：$ENV_FILE
  需要填写的内容：

      DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME
      DATABASE_URL
      REDIS_URL / REDIS_PASSWORD
      CELERY_BROKER_URL / CELERY_RESULT_BACKEND
      SECRET_KEY / ENCRYPT_KEY

  注意：
    1. 不要写 127.0.0.1 / localhost —— 容器内该地址指向容器自身，
       请填写宿主机或数据库服务器的实际 IP
    2. SECRET_KEY / ENCRYPT_KEY 建议用随机字符串
    3. 当前服务虽然已启动，但数据库未配置，功能不可用

  修改完 .env 后，重启两个容器使其生效：

      docker restart mdcgs-backend mdcgs-frontend

  稍等十几秒后验证：

      curl http://127.0.0.1:${BACK_PORT}/api/v1/health

  默认账号：admin / admin123（登录后请及时修改）

EOF
  else
    cat <<EOF

  默认账号 : admin / admin123（请及时修改）
  如后续修改了 .env，重启两个容器使其生效：

      docker restart mdcgs-backend mdcgs-frontend

  常用命令：
      cd $PROJECT_DIR
      docker compose ps                  查看状态
      docker compose logs -f backend     查看后端日志
      docker compose restart             重启全部服务
      docker compose down                停止（数据卷保留）

EOF
  fi
}

# ==============================================================================
# 主流程
# ==============================================================================
main() {
  if [ $# -gt 0 ]; then
    printf '用法：%s   （本脚本无需任何参数）\n' "$(basename "$0")"
    exit 1
  fi

  printf '%sMDCGS 部署脚本%s\n' "$C_BOLD" "$C_RESET"
  info "仓库目录：$PROJECT_DIR"

  fetch_repo
  check_environment
  check_offline_packages

  prepare_env

  # 版本对齐：仓库最新版本（APP_VERSION）已有镜像 -> 直接复用；
  # 没有再走网络检查 + 在线拉取；仍失败则回退本地镜像 / 离线包
  if [ "$LOCAL_IMAGES_READY" -eq 1 ]; then
    ok "本地镜像已是部署版本 ${APP_VERSION}，跳过网络检查与拉取"
    DEPLOY_VIA="本地已有镜像"
  else
    check_network
    if [ "$NETWORK_OK" -eq 1 ] && deploy_online; then
      :
    elif image_exists "$FRONT_IMAGE" && image_exists "$BACK_IMAGE"; then
      info "改用本地已有镜像"
      DEPLOY_VIA="本地已有镜像"
    elif deploy_offline; then
      warn "在线拉取不可用，已回退离线安装包"
    else
      die "无法在线拉取镜像，且本地无镜像、离线包不完整。
      请把离线包放到 ${PROJECT_DIR}/offline/ 后重新执行本脚本"
    fi
  fi

  start_services
  wait_health
  summary
}

main "$@"
