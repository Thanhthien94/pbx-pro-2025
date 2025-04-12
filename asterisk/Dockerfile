FROM debian:bullseye-slim

# Cài đặt các gói cần thiết
RUN apt-get update && apt-get install -y \
    asterisk \
    asterisk-modules \
    asterisk-core-sounds-en \
    asterisk-core-sounds-en-gsm \
    asterisk-core-sounds-en-g722 \
    git \
    curl \
    wget \
    net-tools \
    libxml2-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Xóa các file cấu hình mặc định
RUN rm -f /etc/asterisk/*.conf

# Tạo thư mục cần thiết và cài đặt quyền
RUN mkdir -p /var/lib/asterisk/sounds \
    && mkdir -p /var/spool/asterisk \
    && chown -R asterisk:asterisk /var/lib/asterisk \
    && chown -R asterisk:asterisk /var/spool/asterisk \
    && chown -R asterisk:asterisk /etc/asterisk

# Thiết lập cấu hình SIP cho HEPlify
RUN echo 'rtcachefriends=yes' >> /etc/asterisk/sip.conf \
    && echo 'tos_sip=cs3' >> /etc/asterisk/sip.conf \
    && echo 'tos_audio=ef' >> /etc/asterisk/sip.conf \
    && echo 'tos_video=af41' >> /etc/asterisk/sip.conf \
    && echo 'videosupport=yes' >> /etc/asterisk/sip.conf

# Mở các cổng cần thiết
EXPOSE 5060/udp 5060/tcp 10000-10100/udp 8088 5038

# Ảnh phải chạy với user root để truy cập vào network interfaces
USER root

# Khởi động Asterisk với foreground mode
CMD ["asterisk", "-f"]