import humanize


def humanize_datetime(value):
    if value is None:
        return ""

    return humanize.naturaltime(value)
